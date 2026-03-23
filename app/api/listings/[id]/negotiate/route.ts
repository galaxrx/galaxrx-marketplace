import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { negotiateBodySchema } from "@/lib/validators";
import { activeAcceptedListingNegotiationWhere } from "@/lib/listing-negotiation-hold";
import { isPerUnitListing } from "@/lib/listing-price-display";

const CONTACT_KEYWORDS = [
  "call me",
  "text me",
  "whatsapp",
  "telegram",
  "contact me",
  "phone number",
  "mobile number",
  "reach me",
];
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const URL_REGEX = /\b(?:https?:\/\/|www\.)[^\s]+/i;
const PHONE_TOKEN_REGEX = /(?:\+?\d[\d\s().-]{7,}\d)/g;

function hasPhoneLikeValue(text: string): boolean {
  const tokens = text.match(PHONE_TOKEN_REGEX) ?? [];
  return tokens.some((token) => token.replace(/\D/g, "").length >= 8);
}

function containsOffPlatformContact(content: string): boolean {
  const normalized = content.toLowerCase();
  if (EMAIL_REGEX.test(content) || URL_REGEX.test(content) || hasPhoneLikeValue(content)) {
    return true;
  }
  return CONTACT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const buyerId = (session.user as { id: string }).id;
  const { id: listingId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const parsed = negotiateBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { message: first?.message ?? "Valid proposedPricePerPack required" },
      { status: 400 }
    );
  }
  const { proposedPricePerPack, message: rawMessage } = parsed.data;
  const message = rawMessage?.trim().slice(0, 500);
  if (message && containsOffPlatformContact(message)) {
    return NextResponse.json(
      {
        code: "CONTACT_INFO_BLOCKED",
        message:
          "Contact details can only be shared after payment is completed in-app for this trade.",
      },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { pharmacy: { select: { id: true, name: true } } },
  });
  if (!listing || !listing.isActive) {
    return NextResponse.json({ message: "Listing not found or inactive" }, { status: 404 });
  }
  if ((listing as { priceType?: string }).priceType === "FIXED") {
    return NextResponse.json(
      { message: "This seller has set a fixed price; offers are not accepted for this listing." },
      { status: 400 }
    );
  }
  const sellerId = listing.pharmacyId;
  if (buyerId === sellerId) {
    return NextResponse.json({ message: "Cannot negotiate on your own listing" }, { status: 400 });
  }

  try {
    const existingPending = await prisma.listingNegotiation.findFirst({
      where: { listingId, buyerId, status: "PENDING" },
    });
    if (existingPending) {
      return NextResponse.json(
        { message: "You already have a pending offer on this listing. Wait for the seller to respond or check your messages." },
        { status: 400 }
      );
    }
    // Once the seller has accepted an offer, the price is fixed for this buyer; no further negotiations.
    const existingAccepted = await prisma.listingNegotiation.findFirst({
      where: { listingId, buyerId, ...activeAcceptedListingNegotiationWhere() },
    });
    if (existingAccepted) {
      return NextResponse.json(
        { message: "You already have an accepted offer on this listing. The agreed price applies at checkout — use Buy Now to proceed." },
        { status: 400 }
      );
    }

    const negotiation = await prisma.listingNegotiation.create({
      data: {
        listingId,
        buyerId,
        proposedPricePerPack,
        message: message || null,
        status: "PENDING",
      },
    });

    const threadId = `listing_${listingId}_${buyerId}_${sellerId}`;
    const buyerName = (await prisma.pharmacy.findUnique({
      where: { id: buyerId },
      select: { name: true },
    }))?.name ?? "A buyer";
    await prisma.message.create({
      data: {
        threadId,
        senderId: buyerId,
        recipientId: sellerId,
        content: `${buyerName} has sent a price offer on "${listing.productName}": $${proposedPricePerPack.toFixed(2)} per ${isPerUnitListing(listing.packSize) ? "unit" : "pack"}${message ? ` — "${message}"` : ""}. Please check your dashboard.`,
      },
    });

    return NextResponse.json({
      id: negotiation.id,
      message: "Offer sent. The seller will respond via the dashboard; you'll see updates in Messages.",
    });
  } catch (err) {
    console.error("[negotiate]", err);
    const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "";
    if (msg.includes("does not exist") || msg.includes("ListingNegotiation")) {
      return NextResponse.json(
        { message: "Negotiations are not set up yet. Ask an admin to run: npx prisma migrate deploy" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { message: "Could not save your offer. Please try again." },
      { status: 500 }
    );
  }
}
