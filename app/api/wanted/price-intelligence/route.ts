import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPriceIntelligenceForProduct } from "@/lib/price-intelligence";

export const revalidate = 300; // 5 minutes

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productName = searchParams.get("productName")?.trim();
  const referencePriceParam = searchParams.get("referencePrice");
  const referencePrice = referencePriceParam != null
    ? parseFloat(referencePriceParam)
    : null;

  if (!productName) {
    return NextResponse.json(
      { error: "productName query parameter is required" },
      { status: 400 }
    );
  }

  const allActiveListings = await prisma.listing.findMany({
    where: {
      isActive: true,
      productName: { contains: productName, mode: "insensitive" },
    },
    include: {
      pharmacy: { select: { name: true } },
    },
  });

  const result = getPriceIntelligenceForProduct({
    productName,
    referencePrice: Number.isFinite(referencePrice) ? referencePrice : undefined,
    allActiveListings: allActiveListings.map((l) => ({
      id: l.id,
      pricePerPack: l.pricePerPack,
      quantityUnits: l.quantityUnits,
      expiryDate: l.expiryDate,
      condition: l.condition,
      pharmacy: { name: l.pharmacy.name },
    })),
  });

  const res = NextResponse.json(result);
  res.headers.set("X-Price-Intelligence-Mock", String(!!(result as { isMock?: boolean }).isMock));
  return res;
}
