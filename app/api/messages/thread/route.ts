import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  let body: { listingId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const { listingId } = body;
  if (!listingId || typeof listingId !== "string") {
    return NextResponse.json({ message: "listingId required" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, pharmacyId: true, productName: true, quantityUnits: true, pricePerPack: true },
  });
  if (!listing) {
    return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  }

  const buyerId = pharmacyId;
  const sellerId = listing.pharmacyId;
  if (buyerId === sellerId) {
    return NextResponse.json({ message: "Cannot message yourself" }, { status: 400 });
  }

  const threadId = `listing_${listingId}_${buyerId}_${sellerId}`;

  const existing = await prisma.message.findFirst({ where: { threadId } });
  if (!existing) {
    await prisma.message.create({
      data: {
        threadId,
        senderId: buyerId,
        recipientId: sellerId,
        content: `Hi, I'm interested in your listing: ${listing.productName} (${listing.quantityUnits} units available at $${listing.pricePerPack}/pack). Is this still available?`,
      },
    });
  }

  return NextResponse.json({ threadId });
}
