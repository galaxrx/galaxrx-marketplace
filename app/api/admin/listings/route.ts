import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pharmacy: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json(listings);
}
