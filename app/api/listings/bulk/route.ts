import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Category } from "@prisma/client";
import { z } from "zod";
import { addDays } from "date-fns";
import { totalUnitsFromSellerInput } from "@/lib/listing-units";

const BARCODE_LOOKUP_BASE_URL = "https://api.barcodelookup.com/v3/products";

const bulkItemSchema = z.object({
  barcode: z.string().optional().nullable().or(z.literal("")),
  productName: z.string().optional().nullable().or(z.literal("")),
  stockType: z.enum(["PACK", "QUANTITY"]).default("PACK"),
  quantity: z.number().int().positive(),
  unitsPerPack: z.number().int().positive().default(1),
  expiryDate: z.string(),
  price: z.number().positive(),
});

const bulkSchema = z.object({
  items: z.array(bulkItemSchema).min(1).max(200),
  priceType: z.enum(["FIXED", "NEGOTIABLE"]).default("NEGOTIABLE"),
  shipping: z
    .object({
      fulfillmentType: z.enum(["PICKUP_ONLY", "LOCAL_COURIER", "NATIONAL_SHIPPING"]).optional(),
      deliveryFee: z.number().min(0).optional(),
      stateRestriction: z.string().optional().nullable().or(z.literal("")),
    })
    .optional(),
});

type BarcodeLookupProduct = {
  title?: string;
  brand?: string;
  manufacturer?: string;
  images?: string[];
};

function normalizeBarcodeInput(value: string): string {
  const raw = String(value ?? "").trim().replace(/^'+/, "").replace(/\s+/g, "");
  if (!raw) return "";
  const sci = raw.match(/^(\d+(?:\.\d+)?)e\+?(\d+)$/i);
  if (sci) {
    const mantissa = sci[1];
    const exponent = parseInt(sci[2], 10);
    if (Number.isFinite(exponent) && exponent >= 0) {
      const digits = mantissa.replace(".", "");
      const decimals = mantissa.includes(".") ? mantissa.length - mantissa.indexOf(".") - 1 : 0;
      const zerosToAdd = exponent - decimals;
      if (zerosToAdd >= 0) {
        return (digits + "0".repeat(zerosToAdd)).replace(/\D/g, "");
      }
      const cut = digits.length + zerosToAdd;
      if (cut > 0) return digits.slice(0, cut).replace(/\D/g, "");
    }
  }
  return raw.replace(/\D/g, "");
}

async function lookupByBarcode(barcode: string): Promise<{ productName?: string; brand?: string; images: string[] }> {
  const apiKey = process.env.BARCODELOOKUP_API_KEY?.trim();
  if (!apiKey || !barcode) return { images: [] };
  try {
    const url = new URL(BARCODE_LOOKUP_BASE_URL);
    url.searchParams.set("barcode", barcode);
    url.searchParams.set("formatted", "y");
    url.searchParams.set("key", apiKey);
    const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return { images: [] };
    const payload = (await res.json()) as { products?: BarcodeLookupProduct[] };
    const product = payload.products?.[0];
    const images = Array.isArray(product?.images)
      ? product.images
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .map((v) => v.trim().replace(/^http:\/\//i, "https://"))
          .slice(0, 6)
      : [];
    return {
      productName: product?.title?.trim() || undefined,
      brand: product?.brand?.trim() || product?.manufacturer?.trim() || undefined,
      images,
    };
  } catch {
    return { images: [] };
  }
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
  const pharmacyId = session.user.id as string;
  try {
    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { items, priceType, shipping } = parsed.data;
    const now = new Date();

    let created = 0;
    for (const data of items) {
      const expiryDate = new Date(data.expiryDate);
      if (isNaN(expiryDate.getTime())) continue;
      const isClearance = expiryDate.getTime() - now.getTime() < 90 * 24 * 60 * 60 * 1000;
      const barcode = normalizeBarcodeInput(data.barcode ?? "");
      const enriched = barcode ? await lookupByBarcode(barcode) : { images: [] as string[] };
      const productName =
        (data.productName && data.productName !== "" ? data.productName : null) ??
        enriched.productName ??
        null;
      if (!productName) continue;

      const rowStockType = data.stockType === "QUANTITY" ? "QUANTITY" : "PACK";
      const unitsPerPack = Math.max(1, data.unitsPerPack);
      const quantityUnits =
        rowStockType === "PACK"
          ? totalUnitsFromSellerInput({
              packSize: unitsPerPack,
              fullPacks: data.quantity,
              extraUnits: 0,
            })
          : Math.max(1, data.quantity);
      const pricePerPack =
        rowStockType === "PACK"
          ? data.price
          : data.price;
      const state = (shipping?.stateRestriction ?? "").toUpperCase();
      const stateRestriction = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"].includes(state)
        ? (state as "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT")
        : null;

      await prisma.listing.create({
        data: {
          pharmacyId,
          productName,
          genericName: null,
          brand: enriched.brand ?? null,
          strength: null,
          form: null,
          packSize: rowStockType === "PACK" ? unitsPerPack : 1,
          quantityUnits,
          reservedUnits: 0,
          expiryDate,
          pricePerPack,
          priceType: priceType === "FIXED" ? "FIXED" : "NEGOTIABLE",
          originalRRP: null,
          condition: "SEALED",
          images: enriched.images,
          description: null,
          noteToPurchasers: null,
          isGstFree: false,
          category: "OTHER" as Category,
          fulfillmentType: shipping?.fulfillmentType ?? "NATIONAL_SHIPPING",
          deliveryFee: shipping?.deliveryFee ?? 0,
          stateRestriction,
          isClearance,
          expiresAt: addDays(now, 30),
        },
      });
      created++;
    }
    return NextResponse.json({ created });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed to create listings" }, { status: 500 });
  }
}
