import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
