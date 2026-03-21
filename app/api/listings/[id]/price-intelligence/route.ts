import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPriceIntelligence, IS_MOCK_PRICE_INTELLIGENCE } from "@/lib/price-intelligence";

export const revalidate = 300; // 5 minutes

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      pharmacy: { select: { name: true } },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allActiveListings = await prisma.listing.findMany({
    where: {
      isActive: true,
      productName: { contains: listing.productName, mode: "insensitive" },
    },
    include: {
      pharmacy: { select: { name: true } },
    },
  });

  const result = getPriceIntelligence({
    productName: listing.productName,
    listingPrice: listing.pricePerPack,
    listingId: listing.id,
    expiryDate: listing.expiryDate,
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
  res.headers.set("X-Price-Intelligence-Mock", String(IS_MOCK_PRICE_INTELLIGENCE));
  return res;
}
