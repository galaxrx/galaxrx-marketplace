import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id: wantedItemId, offerId } = await params;
  let action: string;
  try {
    const body = await req.json();
    action = body.action;
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  if (action !== "accept" && action !== "decline" && action !== "proceed") {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }
  const item = await prisma.wantedItem.findUnique({ where: { id: wantedItemId } });
  if (!item) return NextResponse.json({ message: "Wanted item not found" }, { status: 404 });
  if (item.pharmacyId !== (session.user as { id: string }).id) {
    return NextResponse.json({ message: "Only the wanted item owner can accept or decline offers" }, { status: 403 });
  }
  const offer = await prisma.wantedOffer.findFirst({
    where: { id: offerId, wantedItemId },
    include: {
      wantedItem: { select: { productName: true } },
      seller: { select: { email: true, name: true } },
    },
  });
  if (!offer) return NextResponse.json({ message: "Offer not found" }, { status: 404 });

  const offerLine =
    offer.pricePerUnit != null && offer.pricePerUnit > 0
      ? `${offer.quantity} unit(s) @ $${offer.pricePerUnit.toFixed(2)}/unit`
      : `${offer.quantity} pack(s) @ $${offer.pricePerPack.toFixed(2)}/pack`;

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au";
  const buyerId = item.pharmacyId;
  const sellerId = offer.sellerId;
  const threadId = action === "proceed" ? `wanted_${item.id}_${offer.sellerId}` : `wanted_${item.id}_${sellerId}`;

  if (action === "proceed") {
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.wantedOffer.updateMany({
          where: { id: offerId, status: "DECLINED" },
          data: { status: "ACCEPTED" },
        });
        if (updated.count === 0) {
          throw new Error("ALREADY_PROCESSED");
        }
        await tx.message.create({
          data: {
            threadId,
            senderId: item.pharmacyId,
            recipientId: offer.sellerId,
            content: `I've decided to proceed at your offered price for "${offer.wantedItem.productName}" (${offerLine}). Proceed to payment: ${baseUrl}/wanted/offer/${offerId}/pay`,
          },
        });
      });
    } catch (err) {
      if (err instanceof Error && err.message === "ALREADY_PROCESSED") {
        return NextResponse.json(
          { message: "Only declined offers can be proceeded at original price, or offer was already processed" },
          { status: 400 }
        );
      }
      throw err;
    }
    return NextResponse.json({ ok: true, status: "ACCEPTED" });
  }

  // Atomic transition: only update if still PENDING (prevents double-processing and races)
  const newStatus = action === "accept" ? "ACCEPTED" : "DECLINED";
  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.wantedOffer.updateMany({
        where: { id: offerId, status: "PENDING" },
        data: { status: newStatus },
      });
      if (updated.count === 0) {
        throw new Error("ALREADY_PROCESSED");
      }
      if (action === "accept") {
        await tx.message.create({
          data: {
            threadId,
            senderId: buyerId,
            recipientId: sellerId,
            content: `Your offer on "${offer.wantedItem.productName}" (${offerLine}) was accepted. Proceed to payment: ${baseUrl}/wanted/offer/${offerId}/pay`,
          },
        });
      } else {
        await tx.message.create({
          data: {
            threadId,
            senderId: buyerId,
            recipientId: sellerId,
            content: `Your offer on "${offer.wantedItem.productName}" (${offerLine}) was declined. You can still message the buyer or they may proceed at your price later from their Wanted page.`,
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_PROCESSED") {
      return NextResponse.json(
        { message: "Offer already accepted or declined" },
        { status: 400 }
      );
    }
    throw err;
  }

  if (action === "accept" && offer.seller?.email) {
    const acceptorName = (await prisma.pharmacy.findUnique({
      where: { id: buyerId },
      select: { name: true },
    }))?.name ?? "A pharmacy";
    const { sendOfferAccepted } = await import("@/lib/resend");
    const priceSummary =
      offer.pricePerUnit != null && offer.pricePerUnit > 0
        ? `$${offer.pricePerUnit.toFixed(2)} per unit × ${offer.quantity} units`
        : `$${offer.pricePerPack.toFixed(2)} per pack × ${offer.quantity} packs`;
    await sendOfferAccepted(
      offer.seller.email,
      acceptorName,
      offer.wantedItem.productName,
      priceSummary,
      `${baseUrl}/wanted`
    );
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
