import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BARCODE_LOOKUP_BASE_URL = "https://api.barcodelookup.com/v3/products";

type BarcodeLookupProduct = {
  barcode_number?: string;
  title?: string;
  category?: string;
  manufacturer?: string;
  brand?: string;
  description?: string;
  size?: string;
  images?: string[];
};

type BarcodeLookupResponse = {
  products?: BarcodeLookupProduct[];
};

function normalizeBarcode(raw: string): string {
  return raw.replace(/[^\dA-Za-z]/g, "").trim();
}

function normalizeImageUrls(images: string[] | undefined): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((img): img is string => typeof img === "string" && img.trim().length > 0)
    .map((img) => img.trim().replace(/^http:\/\//i, "https://"))
    .slice(0, 6);
}

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = normalizeBarcode(rawCode);
  if (!code) {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  const drug = await prisma.drugMaster.findUnique({
    where: { barcode: code },
  });

  const apiKey = process.env.BARCODELOOKUP_API_KEY?.trim();
  if (!apiKey && drug) {
    return NextResponse.json({
      ...drug,
      images:
        typeof drug.imageUrl === "string" && drug.imageUrl.trim().length > 0
          ? [drug.imageUrl.trim().replace(/^http:\/\//i, "https://")]
          : [],
      lookupAudit: { source: "local_db", apiCalled: false, reason: "missing_api_key" },
    });
  }
  if (!apiKey) {
    return NextResponse.json(null);
  }

  try {
    const url = new URL(BARCODE_LOOKUP_BASE_URL);
    url.searchParams.set("barcode", code);
    url.searchParams.set("formatted", "y");
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) {
      if (drug) {
        const fallbackImages =
          typeof drug.imageUrl === "string" && drug.imageUrl.trim().length > 0
            ? [drug.imageUrl.trim().replace(/^http:\/\//i, "https://")]
            : [];
        console.warn("Barcode lookup non-OK, falling back to local product", {
          code,
          status: res.status,
        });
        return NextResponse.json({
          ...drug,
          images: fallbackImages,
          lookupAudit: { source: "local_db", apiCalled: true, reason: `api_non_ok_${res.status}` },
        });
      }
      return NextResponse.json(null);
    }

    const payload = (await res.json()) as BarcodeLookupResponse;
    const product = payload.products?.[0];
    const externalImages = normalizeImageUrls(product?.images);

    if (drug) {
      // Prefer local DB product data, but enrich with external images if local has none.
      const existingImage =
        typeof drug.imageUrl === "string" && drug.imageUrl.trim().length > 0
          ? [drug.imageUrl.trim().replace(/^http:\/\//i, "https://")]
          : [];
      const finalImages = existingImage.length > 0 ? existingImage : externalImages;
      console.info("Barcode lookup merged with local product", {
        code,
        localImageCount: existingImage.length,
        externalImageCount: externalImages.length,
        finalImageCount: finalImages.length,
      });
      return NextResponse.json({
        ...drug,
        images: finalImages,
        lookupAudit: {
          source: "local_db_enriched",
          apiCalled: true,
          localImageCount: existingImage.length,
          externalImageCount: externalImages.length,
          finalImageCount: finalImages.length,
        },
      });
    }

    if (!product?.title?.trim()) {
      return NextResponse.json(null);
    }

    const mapped = {
      id: "",
      productName: product.title.trim(),
      genericName: null,
      brand: product.brand?.trim() || product.manufacturer?.trim() || null,
      strength: null,
      form: null,
      packSize: 1,
      pbsCode: null,
      barcode: product.barcode_number?.trim() || code,
      category: mapExternalCategoryToLocal(product.category),
      source: "barcodelookup",
      externalCategory: product.category?.trim() || null,
      externalDescription: product.description?.trim() || null,
      externalSize: product.size?.trim() || null,
      imageUrl: externalImages[0] ?? null,
      images: externalImages,
      lookupAudit: {
        source: "external_only",
        apiCalled: true,
        externalImageCount: externalImages.length,
      },
    };

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Barcode lookup error", error);
    return NextResponse.json(null);
  }
}
