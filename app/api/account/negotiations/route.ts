import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const sellerId = (session.user as { id: string }).id;

  const negotiations = await prisma.listingNegotiation.findMany({
    where: {
      status: "PENDING",
      listing: { pharmacyId: sellerId },
    },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          productName: true,
          pricePerPack: true,
          quantityUnits: true,
          isActive: true,
        },
      },
      buyer: {
        select: { id: true, name: true, isVerified: true, state: true },
      },
    },
  });

  return NextResponse.json(negotiations);
}
