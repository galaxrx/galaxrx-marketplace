import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeAcceptedListingNegotiationWhere } from "@/lib/listing-negotiation-hold";

/**
 * GET: Negotiations where the current user is the buyer and the seller accepted.
 * Used on the buyer dashboard to show "Proceed to buy" items.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const buyerId = (session.user as { id: string }).id;

  const negotiations = await prisma.listingNegotiation.findMany({
    where: {
      buyerId,
      ...activeAcceptedListingNegotiationWhere(),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      listing: {
        select: {
          id: true,
          productName: true,
          pricePerPack: true,
          quantityUnits: true,
          packSize: true,
          isActive: true,
          pharmacyId: true,
          images: true,
        },
      },
    },
  });

  return NextResponse.json(negotiations);
}
