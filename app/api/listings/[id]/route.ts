import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeAcceptedListingNegotiationWhere } from "@/lib/listing-negotiation-hold";
import { getPendingListingIdSet } from "@/lib/listing-pending";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      pharmacy: {
        select: {
          id: true,
          name: true,
          suburb: true,
          state: true,
          rating: true,
          reviewCount: true,
          tradeCount: true,
          createdAt: true,
          isVerified: true,
          stripeAccountId: true,
        },
      },
      drugMaster: { select: { pbsCode: true } },
    },
  });
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const isOwner =
    session?.user != null &&
    (session.user as { id: string }).id === listing.pharmacyId;
  const viewerId = session?.user ? (session.user as { id: string }).id : null;
  let hasActiveCheckoutHold = false;
  if (viewerId && !isOwner) {
    const hold = await prisma.paymentAttempt.findFirst({
      where: {
        buyerId: viewerId,
        listingId: id,
        reservationStatus: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    hasActiveCheckoutHold = Boolean(hold);
  }
  if (!isOwner && !hasActiveCheckoutHold) {
    if (!listing.isActive || listing.quantityUnits <= listing.reservedUnits) {
      return NextResponse.json(
        { error: "no_longer_available", message: "This listing is no longer available for purchase." },
        { status: 404 }
      );
    }
  }
  if (!isOwner) {
    await prisma.listing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
  const payload: Record<string, unknown> = {
    ...listing,
    availableUnits: Math.max(0, listing.quantityUnits - listing.reservedUnits),
    viewCount: isOwner ? listing.viewCount : listing.viewCount + 1,
  };
  if (isOwner) {
    const pendingIds = await getPendingListingIdSet([
      {
        id,
        quantityUnits: listing.quantityUnits,
        reservedUnits: listing.reservedUnits,
      },
    ]);
    (payload as Record<string, boolean>).isPending = pendingIds.has(id);
  }
  return NextResponse.json(payload);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.pharmacyId !== (session.user as { id: string }).id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (body.clearPending === true) {
    await prisma.listingNegotiation.updateMany({
      where: { listingId: id, status: "ACCEPTED" },
      data: { status: "REJECTED" },
    });
  }

  /** Price/metadata-only edit: keeps quantityUnits, packSize, reservedUnits (avoids Buy page hiding after price change). */
  if (body.preserveStock === true) {
    const allowedPreserve = [
      "priceType",
      "description",
      "noteToPurchasers",
      "images",
      "isActive",
      "condition",
      "expiryDate",
      "fulfillmentType",
      "deliveryFee",
      "stateRestriction",
      "originalRRP",
      "isGstFree",
    ] as const;
    const pdata: Record<string, unknown> = {};
    for (const k of allowedPreserve) {
      if (body[k] === undefined) continue;
      if (k === "expiryDate" && typeof body[k] === "string") {
        const d = new Date(body[k] as string);
        if (!isNaN(d.getTime())) pdata[k] = d;
        else pdata[k] = body[k];
      } else {
        pdata[k] = body[k];
      }
    }
    if (body.stockType === "PACK") {
      const p = Number(body.pricePerPack);
      if (!Number.isFinite(p) || p <= 0) {
        return NextResponse.json(
          { message: "Valid price per pack required" },
          { status: 400 }
        );
      }
      pdata.pricePerPack = p;
    } else if (body.stockType === "QUANTITY") {
      const unit = Number(body.pricePerUnit);
      if (!Number.isFinite(unit) || unit <= 0) {
        return NextResponse.json(
          { message: "Valid price per unit required" },
          { status: 400 }
        );
      }
      const ps = Math.max(1, listing.packSize);
      pdata.pricePerPack = ps > 1 ? unit * ps : unit;
    } else {
      return NextResponse.json(
        { message: "preserveStock requires stockType PACK or QUANTITY" },
        { status: 400 }
      );
    }
    const updatedPreserve = await prisma.listing.update({ where: { id }, data: pdata });
    revalidatePath("/buy");
    revalidatePath("/listings");
    revalidatePath(`/listings/${id}`);
    revalidatePath("/clearance");
    revalidatePath("/my-listings");
    return NextResponse.json(updatedPreserve);
  }

  const allowed = [
    "pricePerPack",
    "priceType",
    "packSize",
    "quantityUnits",
    "description",
    "noteToPurchasers",
    "images",
    "isActive",
    "condition",
    "expiryDate",
    "fulfillmentType",
    "deliveryFee",
    "stateRestriction",
    "originalRRP",
    "isGstFree",
  ];
  const data: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    // Prisma DateTime must be a Date object, not an ISO string
    if (k === "expiryDate" && typeof body[k] === "string") {
      const d = new Date(body[k] as string);
      if (!isNaN(d.getTime())) data[k] = d;
      else data[k] = body[k];
    } else {
      data[k] = body[k];
    }
  }
  if (body.stockType === "PACK" || body.stockType === "QUANTITY") {
    let q: number;
    let ps: number;
    let price: number;
    if (body.stockType === "PACK") {
      const packCount = Math.floor(Number(body.packCount));
      const unitsPerPack = Math.floor(Number(body.unitsPerPack));
      price = Number(body.pricePerPack);
      if (packCount < 1 || unitsPerPack < 1 || !Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { message: "Valid pack count, units per pack, and price per pack required" },
          { status: 400 }
        );
      }
      ps = unitsPerPack;
      q = packCount * unitsPerPack;
    } else {
      q = Math.floor(Number(body.totalUnits));
      price = Number(body.pricePerUnit);
      if (q < 1 || !Number.isFinite(price) || price <= 0) {
        return NextResponse.json(
          { message: "Valid total quantity and price per unit required" },
          { status: 400 }
        );
      }
      ps = 1;
    }
    if (q < listing.reservedUnits) {
      return NextResponse.json(
        { message: `Cannot reduce stock below ${listing.reservedUnits} units (held in checkout)` },
        { status: 400 }
      );
    }
    data.packSize = ps;
    data.quantityUnits = q;
    data.pricePerPack = price;
    data.isActive = q > 0;
  } else if (typeof data.quantityUnits === "number") {
    const q = Math.floor(data.quantityUnits as number);
    if (q < 1) {
      return NextResponse.json({ message: "quantityUnits must be at least 1" }, { status: 400 });
    }
    if (q < listing.reservedUnits) {
      return NextResponse.json(
        { message: `Cannot reduce stock below ${listing.reservedUnits} units (held in checkout)` },
        { status: 400 }
      );
    }
    data.quantityUnits = q;
    data.isActive = q > 0;
  }
  const updated = await prisma.listing.update({ where: { id }, data });

  // Revalidate Buy, Listings, and My listings so updated listing shows immediately
  revalidatePath("/buy");
  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/clearance");
  revalidatePath("/my-listings");

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.pharmacyId !== (session.user as { id: string }).id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  await prisma.listing.update({ where: { id }, data: { isActive: false } });

  revalidatePath("/buy");
  revalidatePath("/listings");
  revalidatePath(`/listings/${id}`);
  revalidatePath("/clearance");

  return NextResponse.json({ ok: true });
}
