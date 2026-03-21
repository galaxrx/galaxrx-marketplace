import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservationsForListingIds } from "@/lib/listing-reservation";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";
import { activeAcceptedListingNegotiationWhere } from "@/lib/listing-negotiation-hold";

/**
 * Resolve cart listing IDs to live listing + seller data for checkout UI.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const buyerId = (session.user as { id: string }).id;

  let body: { listingIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const ids = Array.isArray(body.listingIds) ? body.listingIds.filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ listings: [] });
  }
  if (ids.length > 50) {
    return NextResponse.json({ message: "Too many items" }, { status: 400 });
  }

  await releaseExpiredReservationsForListingIds(ids);

  const listings = await prisma.listing.findMany({
    where: {
      id: { in: ids },
      pharmacyId: { not: buyerId },
      ...listingBuyableByOthersWhere(),
    },
    include: {
      pharmacy: {
        select: {
          id: true,
          name: true,
          suburb: true,
          state: true,
          postcode: true,
          stripeAccountId: true,
        },
      },
    },
  });

  const negotiations = await prisma.listingNegotiation.findMany({
    where: {
      buyerId,
      listingId: { in: listings.map((l) => l.id) },
      ...activeAcceptedListingNegotiationWhere(),
    },
    orderBy: { updatedAt: "desc" },
  });
  const priceByListing = new Map<string, number>();
  for (const n of negotiations) {
    if (!priceByListing.has(n.listingId)) {
      priceByListing.set(n.listingId, n.proposedPricePerPack);
    }
  }

  const payload = listings.map((l) => {
    const images = (l.images ?? []).slice(0, 3);
    const available = Math.max(0, l.quantityUnits - l.reservedUnits);
    return {
      id: l.id,
      productName: l.productName,
      pricePerPack: priceByListing.get(l.id) ?? l.pricePerPack,
      packSize: l.packSize,
      quantityUnits: l.quantityUnits,
      availableUnits: available,
      isActive: l.isActive,
      fulfillmentType: l.fulfillmentType,
      deliveryFee: l.deliveryFee ?? 0,
      pharmacyId: l.pharmacyId,
      pharmacy: l.pharmacy,
      isGstFree: l.isGstFree,
      images: images.slice(0, 3),
    };
  });

  return NextResponse.json({ listings: payload });
}
