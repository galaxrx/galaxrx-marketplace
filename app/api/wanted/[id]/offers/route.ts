import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createOfferSchema = z.object({
  quantity: z.coerce.number().int().positive(),
  pricePerPack: z.coerce.number().positive().optional(),
  /** Required when wanted item is UNIT-based */
  pricePerUnit: z.coerce.number().positive().optional(),
  message: z.string().max(500).optional().or(z.literal("")),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id: wantedItemId } = await params;
  const item = await prisma.wantedItem.findUnique({
    where: { id: wantedItemId },
    include: {
      offers: {
        orderBy: { createdAt: "desc" },
        include: { seller: { select: { id: true, name: true, isVerified: true, state: true } } },
      },
    },
  });
  if (!item) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (item.pharmacyId !== (session.user as { id: string }).id) {
    return NextResponse.json({ message: "Only the wanted item owner can view offers" }, { status: 403 });
  }
  return NextResponse.json(item.offers);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const sellerId = (session.user as { id: string }).id;
  const { id: wantedItemId } = await params;
  const item = await prisma.wantedItem.findUnique({ where: { id: wantedItemId } });
  if (!item) return NextResponse.json({ message: "Wanted item not found" }, { status: 404 });
  if (item.pharmacyId === sellerId) {
    return NextResponse.json({ message: "You cannot make an offer on your own wanted request" }, { status: 400 });
  }
  if (!item.isActive || item.expiresAt <= new Date()) {
    return NextResponse.json({ message: "This wanted request is no longer active" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const parsed = createOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const isUnit = item.quantityKind === "UNIT";
    if (isUnit) {
      const pu = Number(data.pricePerUnit);
      if (!Number.isFinite(pu) || pu <= 0) {
        return NextResponse.json(
          { message: "pricePerUnit is required for unit-based wanted requests" },
          { status: 400 }
        );
      }
    } else {
      const pp = Number(data.pricePerPack);
      if (!Number.isFinite(pp) || pp <= 0) {
        return NextResponse.json(
          { message: "pricePerPack is required for pack-based wanted requests" },
          { status: 400 }
        );
      }
    }
    const offer = await prisma.wantedOffer.create({
      data: {
        wantedItemId,
        sellerId,
        quantity: Number(data.quantity),
        pricePerPack: isUnit ? 0 : Number(data.pricePerPack),
        pricePerUnit: isUnit ? Number(data.pricePerUnit) : null,
        message: data.message && String(data.message).trim() ? String(data.message).trim() : null,
        status: "PENDING",
      },
      include: { seller: { select: { id: true, name: true, isVerified: true, state: true } } },
    });
    return NextResponse.json(offer);
  } catch (e) {
    console.error(e);
    let msg = e instanceof Error ? e.message : "Failed to create offer";
    if (msg.includes("does not exist") || msg.includes("Unknown model") || msg.includes("WantedOffer")) {
      msg = "Database not ready for offers. Run: npx prisma db push";
    }
    return NextResponse.json(
      { message: msg },
      { status: 500 }
    );
  }
}
