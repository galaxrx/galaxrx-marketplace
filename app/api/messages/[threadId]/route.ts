import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { OrderStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
const PRE_PAYMENT_ALLOWED_ORDER_STATUSES = [
  "PAID",
  "SHIPPED",
  "DELIVERED",
  "DISPUTED",
  "DISPUTE_LOST",
  "REFUNDED",
  "REFUNDED_PARTIAL",
  "REFUNDED_FULL",
] as const satisfies OrderStatus[];

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

async function hasPaidOrderForThread(threadId: string): Promise<boolean> {
  if (threadId.startsWith("listing_")) {
    const parts = threadId.split("_");
    if (parts.length < 4) return false;
    const [, listingId, buyerId, sellerId] = parts;
    const paidOrder = await prisma.order.findFirst({
      where: {
        listingId,
        buyerId,
        sellerId,
        status: { in: PRE_PAYMENT_ALLOWED_ORDER_STATUSES },
      },
      select: { id: true },
    });
    return Boolean(paidOrder);
  }

  if (threadId.startsWith("wanted_")) {
    const parts = threadId.split("_");
    if (parts.length < 3) return false;
    const [, wantedItemId, sellerId] = parts;
    const wantedItem = await prisma.wantedItem.findUnique({
      where: { id: wantedItemId },
      select: { pharmacyId: true },
    });
    if (!wantedItem) return false;
    const paidOrder = await prisma.order.findFirst({
      where: {
        buyerId: wantedItem.pharmacyId,
        sellerId,
        wantedOffer: { is: { wantedItemId } },
        status: { in: PRE_PAYMENT_ALLOWED_ORDER_STATUSES },
      },
      select: { id: true },
    });
    return Boolean(paidOrder);
  }

  return false;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const { threadId } = await params;
  const messages = await prisma.message.findMany({
    where: {
      threadId,
      OR: [{ senderId: pharmacyId }, { recipientId: pharmacyId }],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, isVerified: true } },
    },
  });
  await prisma.message.updateMany({
    where: { threadId, recipientId: pharmacyId },
    data: { isRead: true },
  });
  let recipientId: string | null = null;
  if (messages.length > 0) {
    const other = messages.find((m) => m.senderId !== pharmacyId);
    if (other) recipientId = other.senderId;
    else recipientId = messages[0].recipientId;
  } else {
    if (threadId.startsWith("listing_")) {
      const parts = threadId.split("_");
      if (parts.length >= 4) {
        const [, , buyerId, sellerId] = parts;
        recipientId = pharmacyId === buyerId ? sellerId : buyerId;
      }
    } else if (threadId.startsWith("wanted_")) {
      const parts = threadId.split("_");
      if (parts.length >= 3) {
        const wantedId = parts[1];
        const responderId = parts[2];
        const wanted = await prisma.wantedItem.findUnique({
          where: { id: wantedId },
          select: { pharmacyId: true },
        });
        if (wanted) {
          recipientId =
            pharmacyId === wanted.pharmacyId ? responderId : wanted.pharmacyId;
        }
      }
    }
  }
  return NextResponse.json({ messages, recipientId });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const { threadId } = await params;
  const body = await req.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const recipientId = typeof body.recipientId === "string" ? body.recipientId : null;
  if (!content) {
    return NextResponse.json(
      { message: "Content required" },
      { status: 400 }
    );
  }
  if (!recipientId) {
    return NextResponse.json(
      { message: "recipientId required" },
      { status: 400 }
    );
  }
  const isContactInfoShared = containsOffPlatformContact(content);
  if (isContactInfoShared) {
    const paidOrderExists = await hasPaidOrderForThread(threadId);
    if (!paidOrderExists) {
      return NextResponse.json(
        {
          code: "CONTACT_INFO_BLOCKED",
          message:
            "Contact details can only be shared after payment is completed in-app for this trade.",
        },
        { status: 400 }
      );
    }
  }
  const message = await prisma.message.create({
    data: {
      threadId,
      senderId: pharmacyId,
      recipientId,
      content,
    },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(message);
}
