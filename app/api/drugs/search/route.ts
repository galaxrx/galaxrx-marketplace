import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BARCODE_LOOKUP_BASE_URL = "https://api.barcodelookup.com/v3/products";

type BarcodeLookupProduct = {
  barcode_number?: string;
  title?: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  size?: string;
  images?: string[];
};

type BarcodeLookupResponse = {
  products?: BarcodeLookupProduct[];
};

function mapExternalCategoryToLocal(categoryRaw: string | undefined): string {
  const category = (categoryRaw ?? "").toLowerCase();
  if (!category) return "OTHER";
  if (category.includes("vitamin") || category.includes("supplement")) return "VITAMINS_SUPPLEMENTS";
  if (category.includes("medicine") || category.includes("drug")) return "MEDICINES";
  if (category.includes("first aid")) return "FIRST_AID";
  if (category.includes("medical")) return "MEDICAL_SUPPLIES";
  if (category.includes("baby") || category.includes("pregnancy")) return "PREGNANCY_BABY";
  if (category.includes("skin")) return "SKINCARE";
  if (category.includes("hair")) return "HAIR_CARE";
  if (category.includes("oral")) return "ORAL_CARE";
  if (category.includes("personal care")) return "PERSONAL_CARE";
  if (category.includes("sport") || category.includes("fitness")) return "SPORT_FITNESS";
  if (category.includes("pet")) return "HOME_PET";
  if (category.includes("fragrance") || category.includes("perfume")) return "FRAGRANCE";
  if (category.includes("cosmetic") || category.includes("beauty")) return "COSMETICS";
  return "OTHER";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }
  const drugs = await prisma.drugMaster.findMany({
    where: {
      OR: [
        { productName: { contains: q, mode: "insensitive" } },
        { genericName: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 8,
  });
  if (drugs.length > 0) {
    return NextResponse.json(drugs);
  }

  const apiKey = process.env.BARCODELOOKUP_API_KEY?.trim();
  if (!apiKey) return NextResponse.json([]);

  try {
    const url = new URL(BARCODE_LOOKUP_BASE_URL);
    url.searchParams.set("search", q);
    url.searchParams.set("formatted", "y");
    url.searchParams.set("key", apiKey);
    const res = await fetch(url.toString(), { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return NextResponse.json([]);

    const payload = (await res.json()) as BarcodeLookupResponse;
    const mapped = (payload.products ?? []).slice(0, 8).map((p, idx) => ({
      id: "",
      productName: p.title?.trim() || `Product ${idx + 1}`,
      genericName: null,
      brand: p.brand?.trim() || p.manufacturer?.trim() || null,
      strength: null,
      form: p.size?.trim() || null,
      packSize: 1,
      pbsCode: null,
      category: mapExternalCategoryToLocal(p.category),
      barcode: p.barcode_number?.trim() || null,
      imageUrl: Array.isArray(p.images) ? p.images[0] ?? null : null,
      images: Array.isArray(p.images)
        ? p.images
            .filter((img): img is string => typeof img === "string" && img.trim().length > 0)
            .map((img) => img.trim().replace(/^http:\/\//i, "https://"))
            .slice(0, 6)
        : [],
      source: "barcodelookup",
    }));
    return NextResponse.json(mapped.filter((m) => m.productName));
  } catch {
    return NextResponse.json([]);
  }
}
