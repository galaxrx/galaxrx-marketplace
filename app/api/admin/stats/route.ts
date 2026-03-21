import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const [orders, pharmacyCount, pendingCount, newRegistrations] =
    await Promise.all([
      prisma.order.findMany({
        where: { status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
        select: { grossAmount: true, platformFee: true },
      }),
      prisma.pharmacy.count({ where: { isVerified: true } }),
      prisma.pharmacy.count({ where: { isVerified: false } }),
      prisma.pharmacy.count({
        where: { createdAt: { gte: subDays(new Date(), 7) } },
      }),
    ]);
  const totalGMV = orders.reduce((s, o) => s + o.grossAmount, 0);
  const totalFees = orders.reduce((s, o) => s + o.platformFee, 0);
  return NextResponse.json({
    totalGMV: Math.round(totalGMV * 100) / 100,
    platformFeesCollected: Math.round(totalFees * 100) / 100,
    activePharmacies: pharmacyCount,
    pendingVerifications: pendingCount,
    newRegistrationsLast7Days: newRegistrations,
  });
}
