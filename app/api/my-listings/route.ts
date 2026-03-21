import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const pharmacyId = (session?.user as { id?: string })?.id;
  if (!pharmacyId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const listings = await prisma.listing.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(listings);
}
