import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { addDays } from "date-fns";
import { sendListingPublished } from "@/lib/resend";
import { notifyWantedMatchForListing } from "@/lib/notify-wanted-match";
import { CATEGORY_VALUES } from "@/lib/categories";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";
import { releaseStaleListingReservationsBatchThrottled } from "@/lib/listing-reservation";

/** PACK: number of packs × units per pack, price per pack. QUANTITY: total units, price per unit (stored as packSize 1). */
const createSchema = z
  .object({
    drugMasterId: z.string().optional().nullable(),
    productName: z.string().min(1),
    genericName: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    strength: z.string().optional().nullable(),
    form: z.string().optional().nullable(),
    stockType: z.enum(["PACK", "QUANTITY"]),
    packCount: z.number().int().min(1).optional(),
    unitsPerPack: z.number().int().min(1).optional(),
    totalUnits: z.number().int().min(1).optional(),
    pricePerPack: z.number().positive().optional(),
    pricePerUnit: z.number().positive().optional(),
    expiryDate: z.string(),
    priceType: z.enum(["FIXED", "NEGOTIABLE"]),
    originalRRP: z.number().optional(),
    condition: z.enum(["SEALED", "OPENED"]),
    isGstFree: z.boolean(),
    images: z.array(z.string()).default([]),
    description: z.string().optional(),
    noteToPurchasers: z.string().optional(),
    category: z.enum(CATEGORY_VALUES),
    fulfillmentType: z.enum(["PICKUP_ONLY", "LOCAL_COURIER", "NATIONAL_SHIPPING"]).default("NATIONAL_SHIPPING"),
    deliveryFee: z.number().min(0).optional().default(0),
    stateRestriction: z.enum(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]).optional().nullable(),
  })
  .superRefine((d, ctx) => {
    if (d.stockType === "PACK") {
      if (d.packCount == null || d.packCount < 1) {
        ctx.addIssue({ code: "custom", message: "Number of packs required", path: ["packCount"] });
      }
      if (d.unitsPerPack == null || d.unitsPerPack < 1) {
        ctx.addIssue({ code: "custom", message: "Units per pack required", path: ["unitsPerPack"] });
      }
      if (d.pricePerPack == null || d.pricePerPack <= 0) {
        ctx.addIssue({ code: "custom", message: "Price per pack required", path: ["pricePerPack"] });
      }
    } else {
      if (d.totalUnits == null || d.totalUnits < 1) {
        ctx.addIssue({ code: "custom", message: "Quantity required", path: ["totalUnits"] });
      }
      if (d.pricePerUnit == null || d.pricePerUnit <= 0) {
        ctx.addIssue({ code: "custom", message: "Price per unit required", path: ["pricePerUnit"] });
      }
    }
  });

function listingStockFromBody(data: z.infer<typeof createSchema>): {
  packSize: number;
  quantityUnits: number;
  pricePerPack: number;
} {
  if (data.stockType === "PACK") {
    const unitsPerPack = data.unitsPerPack!;
    const packCount = data.packCount!;
    return {
      packSize: unitsPerPack,
      quantityUnits: packCount * unitsPerPack,
      pricePerPack: data.pricePerPack!,
    };
  }
  return {
    packSize: 1,
    quantityUnits: data.totalUnits!,
    pricePerPack: data.pricePerUnit!,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const state = searchParams.get("state") ?? "";
  const expiry = searchParams.get("expiry") ?? ""; // under30, 30-60, 60-90, over90
  const condition = searchParams.get("condition") ?? "";
  const fulfillment = searchParams.get("fulfillment") ?? "";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const sort = searchParams.get("sort") ?? "newest";
  const clearance = searchParams.get("clearance") === "true";
  const pharmacyId = searchParams.get("pharmacyId");
  const addedAfter = searchParams.get("addedAfter") ?? ""; // ISO date: show items added after this date

  await releaseStaleListingReservationsBatchThrottled({
    maxAttempts: 40,
    minIntervalMs: 60_000,
  });

  const where: Record<string, unknown> = { isActive: true };
  if (pharmacyId) where.pharmacyId = pharmacyId;
  if (addedAfter) {
    const afterDate = new Date(addedAfter);
    if (!isNaN(afterDate.getTime())) {
      (where as Record<string, unknown>).createdAt = { gte: afterDate };
    }
  }
  if (search) {
    where.OR = [
      { productName: { contains: search, mode: "insensitive" } },
      { genericName: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;
  if (state) where.stateRestriction = state;
  if (condition) where.condition = condition;
  if (fulfillment) where.fulfillmentType = fulfillment;
  if (clearance) where.isClearance = true;
  const minP = minPrice != null && minPrice !== "" ? parseFloat(minPrice) : NaN;
  const maxP = maxPrice != null && maxPrice !== "" ? parseFloat(maxPrice) : NaN;
  if (!isNaN(minP) || !isNaN(maxP)) {
    where.pricePerPack = {};
    if (!isNaN(minP)) (where.pricePerPack as Record<string, number>).gte = minP;
    if (!isNaN(maxP)) (where.pricePerPack as Record<string, number>).lte = maxP;
  }
  if (expiry) {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    if (expiry === "under30") {
      where.expiryDate = { gte: now, lte: new Date(now.getTime() + 30 * day) };
    } else if (expiry === "30-60") {
      where.expiryDate = { gte: new Date(now.getTime() + 30 * day), lte: new Date(now.getTime() + 60 * day) };
    } else if (expiry === "60-90") {
      where.expiryDate = { gte: new Date(now.getTime() + 60 * day), lte: new Date(now.getTime() + 90 * day) };
    } else if (expiry === "over90") {
      where.expiryDate = { gte: new Date(now.getTime() + 90 * day) };
    }
  }

  // Default: order by date (newest first). Explicit date ordering so all items are considered by date.
  let orderBy: { pricePerPack?: "asc"; createdAt?: "desc" | "asc"; expiryDate?: "asc" } = { createdAt: "desc" };
  if (sort === "price") orderBy = { pricePerPack: "asc" };
  else if (sort === "expiry") orderBy = { expiryDate: "asc" };
  else if (sort === "oldest") orderBy = { createdAt: "asc" };
  else orderBy = { createdAt: "desc" }; // newest (default)

  const listings = await prisma.listing.findMany({
    where: { ...where, ...listingBuyableByOthersWhere() },
    orderBy,
    take: 200,
    include: {
      pharmacy: { select: { name: true, rating: true, tradeCount: true, isVerified: true } },
    },
  });
  let result = listings;
  if (sort === "discount") {
    result = [...listings].filter((l) => l.originalRRP != null).sort((a, b) => {
      const dA = a.originalRRP ? (1 - a.pricePerPack / a.originalRRP) : 0;
      const dB = b.originalRRP ? (1 - b.pricePerPack / b.originalRRP) : 0;
      return dB - dA;
    });
  }
  return NextResponse.json(
    result.map((l) => ({
      ...l,
      availableUnits: Math.max(0, l.quantityUnits - l.reservedUnits),
    }))
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: (session.user as { id: string }).id },
  });
  if (!pharmacy?.isVerified) {
    return NextResponse.json({ message: "Pharmacy must be verified to list." }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid input", errors: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const { packSize, quantityUnits, pricePerPack } = listingStockFromBody(data);
    const expiryDate = new Date(data.expiryDate);
    const now = new Date();
    const isClearance = expiryDate.getTime() - now.getTime() < 90 * 24 * 60 * 60 * 1000;
    let listing;
    try {
      listing = await prisma.listing.create({
        data: {
          pharmacyId: (session.user as { id: string }).id,
          drugMasterId: (data.drugMasterId && data.drugMasterId.trim() !== "") ? data.drugMasterId : null,
          productName: data.productName,
          genericName: data.genericName ?? null,
          brand: data.brand ?? null,
          strength: data.strength ?? null,
          form: data.form ?? null,
          packSize,
          quantityUnits,
          reservedUnits: 0,
          expiryDate,
          pricePerPack,
          priceType: data.priceType,
          originalRRP: data.originalRRP ?? null,
          condition: data.condition as "SEALED" | "OPENED",
          images: data.images,
          description: data.description ?? null,
          noteToPurchasers: data.noteToPurchasers ?? null,
          category: data.category,
          fulfillmentType: data.fulfillmentType as "PICKUP_ONLY" | "LOCAL_COURIER" | "NATIONAL_SHIPPING",
          deliveryFee: data.deliveryFee ?? 0,
          stateRestriction: data.stateRestriction as "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT" | null,
          isGstFree: data.isGstFree,
          isClearance,
          expiresAt: addDays(now, 30),
        },
      });
    } catch (e) {
      console.error("Listing create error:", e);
      const err = e as { message?: string; code?: string };
      const msg = err?.message ?? "";
      const isDbSchema = /column|does not exist|Unknown arg|Invalid.*enum/i.test(msg);
      const hint = isDbSchema
        ? " Database schema may be out of date. Run: npx prisma migrate deploy"
        : "";
      return NextResponse.json(
        { message: msg ? `Failed to create listing: ${msg}${hint}` : "Failed to create listing" },
        { status: 500 }
      );
    }
    try {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: (session.user as { id: string }).id },
        select: { email: true },
      });
      if (pharmacy?.email) {
        await sendListingPublished(pharmacy.email, listing.productName);
      }
    } catch (emailErr) {
      console.error("Listing created but notification email failed:", emailErr);
      // Listing was created; do not fail the request
    }
    try {
      await notifyWantedMatchForListing({
        id: listing.id,
        productName: listing.productName,
        pharmacyId: listing.pharmacyId,
      });
    } catch (notifyErr) {
      console.error("Wanted-match notifications failed:", notifyErr);
      // Listing was created; do not fail the request
    }
    return NextResponse.json(listing);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed to create listing" }, { status: 500 });
  }
}
