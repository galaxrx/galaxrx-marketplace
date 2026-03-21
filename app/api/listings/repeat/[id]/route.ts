import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
  });
  if (!pharmacy?.isVerified) {
    return NextResponse.json(
      { message: "Pharmacy must be verified to list." },
      { status: 403 }
    );
  }
  const { id } = await params;
  const source = await prisma.listing.findFirst({
    where: { id, pharmacyId },
  });
  if (!source) {
    return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  }
  const now = new Date();
  const expiryDate = new Date(source.expiryDate);
  const isClearance =
    expiryDate.getTime() - now.getTime() < 90 * 24 * 60 * 60 * 1000;
  const listing = await prisma.listing.create({
    data: {
      pharmacyId: source.pharmacyId,
      drugMasterId: source.drugMasterId,
      productName: source.productName,
      genericName: source.genericName,
      brand: source.brand,
      strength: source.strength,
      form: source.form,
      packSize: source.packSize,
      quantityUnits: source.quantityUnits,
      reservedUnits: 0,
      expiryDate: source.expiryDate,
      pricePerPack: source.pricePerPack,
      originalRRP: source.originalRRP,
      condition: source.condition,
      images: source.images,
      description: source.description,
      category: source.category,
      fulfillmentType: source.fulfillmentType,
      deliveryFee: source.deliveryFee ?? 0,
      stateRestriction: source.stateRestriction,
      isGstFree: source.isGstFree,
      isClearance,
      expiresAt: addDays(now, 30),
    },
  });
  return NextResponse.json(listing);
}
