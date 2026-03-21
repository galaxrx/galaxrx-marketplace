import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  productName: z.string().min(1),
  strength: z.string().optional(),
  barcode: z.string().optional(),
  imageUrl: z.string().max(2000).optional().or(z.literal("")),
  quantity: z.number().int().positive(),
  maxPrice: z.number().positive().optional(),
  urgency: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]),
  isSOS: z.boolean().optional(),
  notes: z.string().max(200).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const item = await prisma.wantedItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ message: "Wanted item not found" }, { status: 404 });
  }
  if (item.pharmacyId !== (session.user as { id: string }).id) {
    return NextResponse.json(
      { message: "Only owner can update" },
      { status: 403 }
    );
  }
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const updated = await prisma.wantedItem.update({
      where: { id },
      data: {
        productName: data.productName,
        strength: data.strength ?? null,
        barcode: data.barcode?.trim() || null,
        imageUrl:
          data.imageUrl && data.imageUrl !== "" && data.imageUrl.startsWith("http")
            ? data.imageUrl
            : null,
        quantity: data.quantity,
        maxPrice: data.maxPrice ?? null,
        urgency: data.urgency as "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
        ...(typeof data.isSOS === "boolean" && { isSOS: data.isSOS }),
        notes: data.notes ?? null,
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to update wanted item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const item = await prisma.wantedItem.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ message: "Wanted item not found" }, { status: 404 });
  }
  if (item.pharmacyId !== (session.user as { id: string }).id) {
    return NextResponse.json(
      { message: "Only owner can deactivate" },
      { status: 403 }
    );
  }
  await prisma.wantedItem.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
