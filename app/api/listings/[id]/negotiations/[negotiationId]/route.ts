import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { negotiationAcceptanceHoldHours } from "@/lib/listing-negotiation-hold";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; negotiationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const sellerId = (session.user as { id: string }).id;
  const { id: listingId, negotiationId } = await params;
  let body: { action: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  if (body.action !== "accept" && body.action !== "reject") {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  const negotiation = await prisma.listingNegotiation.findFirst({
    where: { id: negotiationId, listingId },
    include: {
      listing: {
        select: {
          pharmacyId: true,
          productName: true,
          pricePerPack: true,
          quantityUnits: true,
        },
      },
      buyer: { select: { id: true, name: true } },
    },
  });
  if (!negotiation) {
    return NextResponse.json({ message: "Negotiation not found" }, { status: 404 });
  }
  if (negotiation.listing.pharmacyId !== sellerId) {
    return NextResponse.json({ message: "Only the listing seller can respond" }, { status: 403 });
  }
  const newStatus = body.action === "accept" ? "ACCEPTED" : "REJECTED";
  const buyerId = negotiation.buyerId;
  const threadId = `listing_${negotiation.listingId}_${buyerId}_${sellerId}`;

  try {
    await prisma.$transaction(async (tx) => {
      if (body.action === "accept") {
        // At most one ACCEPTED per (listing, buyer): supersede any other ACCEPTED for this pair
        await tx.listingNegotiation.updateMany({
          where: {
            listingId: negotiation.listingId,
            buyerId: negotiation.buyerId,
            status: "ACCEPTED",
            id: { not: negotiationId },
          },
          data: { status: "REJECTED" },
        });
      }

      // Atomic transition: only update if still PENDING (prevents double-processing and races)
      const updated = await tx.listingNegotiation.updateMany({
        where: { id: negotiationId, status: "PENDING" },
        data:
          body.action === "accept"
            ? { status: newStatus, acceptedAt: new Date() }
            : { status: newStatus },
      });

      if (updated.count === 0) {
        const current = await tx.listingNegotiation.findUnique({
          where: { id: negotiationId },
          select: { status: true },
        });
        const msg = current?.status ? `already ${current.status.toLowerCase()}` : "not found";
        throw new Error(`ALREADY_PROCESSED:${msg}`);
      }

      if (body.action === "accept") {
        await tx.message.create({
          data: {
            threadId,
            senderId: sellerId,
            recipientId: buyerId,
            content: `Your offer of $${negotiation.proposedPricePerPack.toFixed(2)}/pack for "${negotiation.listing.productName}" was accepted. The agreed price applies at checkout for ${negotiationAcceptanceHoldHours()} hours — complete your purchase in that window. Please check your dashboard.`,
          },
        });
      } else {
        await tx.message.create({
          data: {
            threadId,
            senderId: sellerId,
            recipientId: buyerId,
            content: `Your offer on "${negotiation.listing.productName}" was rejected. You can still buy at the seller's listed price ($${negotiation.listing.pricePerPack.toFixed(2)}/pack). Please check your dashboard.`,
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("ALREADY_PROCESSED:")) {
      return NextResponse.json(
        { message: "This offer was already accepted or rejected" },
        { status: 400 }
      );
    }
    throw err;
  }

  return NextResponse.json({
    ok: true,
    status: newStatus,
  });
}
