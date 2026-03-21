import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays } from "date-fns";

const createSchema = z
  .object({
    productName: z.string().min(1),
    strength: z.string().optional(),
    barcode: z.string().optional(),
    imageUrl: z.string().max(2000).optional().or(z.literal("")),
    quantityKind: z.enum(["UNIT", "PACK"]).optional().default("UNIT"),
    /** PACK: number of packs; UNIT: total units */
    quantity: z.number().int().positive(),
    /** Required when PACK: how many units in each pack */
    unitsPerPack: z.number().int().min(1).optional(),
    maxPrice: z.number().positive().optional(),
    urgency: z.enum(["LOW", "NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
    isSOS: z.boolean().optional().default(false),
    notes: z.string().max(200).optional(),
  })
  .superRefine((d, ctx) => {
    if ((d.quantityKind ?? "UNIT") === "PACK") {
      if (d.unitsPerPack == null || d.unitsPerPack < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Units per pack is required when requesting by pack",
          path: ["unitsPerPack"],
        });
      }
    }
  });

export async function GET() {
  const items = await prisma.wantedItem.findMany({
    where: { isActive: true, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    include: {
      pharmacy: {
        select: { id: true, name: true, isVerified: true, state: true },
      },
    },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const imageUrl =
      data.imageUrl && data.imageUrl !== "" && data.imageUrl.startsWith("http")
        ? data.imageUrl
        : null;
    const kind = data.quantityKind ?? "UNIT";
    const baseData = {
      pharmacyId,
      productName: data.productName,
      strength: data.strength ?? null,
      barcode: data.barcode?.trim() || null,
      imageUrl,
      quantityKind: kind,
      quantity: data.quantity,
      unitsPerPack: kind === "PACK" ? data.unitsPerPack! : null,
      maxPrice: data.maxPrice ?? null,
      urgency: data.urgency as "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
      notes: data.notes ?? null,
      expiresAt: addDays(new Date(), 7),
    };

    // Ensure isSOS column exists (idempotent; safe if already present)
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "WantedItem" ADD COLUMN IF NOT EXISTS "isSOS" BOOLEAN NOT NULL DEFAULT false;`
      );
    } catch {
      // Ignore (column likely exists or DB doesn't support IF NOT EXISTS)
    }

    const item = await prisma.wantedItem.create({
      data: { ...baseData, isSOS: data.isSOS ?? false },
    });
    return NextResponse.json(item);
  } catch (e) {
    const err = e as Error;
    console.error("Wanted create failed:", err);
    const message =
      process.env.NODE_ENV === "development" && err?.message
        ? err.message
        : "Failed to create wanted item";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
