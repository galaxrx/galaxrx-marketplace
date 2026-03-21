import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      state: true,
      isVerified: true,
      rating: true,
      reviewCount: true,
      tradeCount: true,
      createdAt: true,
    },
  });
  if (!pharmacy) {
    return NextResponse.json({ message: "Pharmacy not found" }, { status: 404 });
  }
  const listings = await prisma.listing.findMany({
    where: { pharmacyId: id, ...listingBuyableByOthersWhere() },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ pharmacy, listings });
}
