import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardStats({ pharmacyId }: { pharmacyId: string }) {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Parallel queries need pool headroom (see DATABASE_URL connection_limit in .env.example).
  const [
    activeListings,
    ordersThisMonth,
    pharmacy,
    expiringCount,
    pendingPayoutsResult,
  ] = await Promise.all([
    prisma.listing.count({ where: { pharmacyId, isActive: true } }),
    prisma.order.count({
      where: {
        OR: [{ buyerId: pharmacyId }, { sellerId: pharmacyId }],
        createdAt: { gte: startOfMonth },
      },
    }),
    prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { rating: true, reviewCount: true },
    }),
    prisma.listing.count({
      where: {
        pharmacyId,
        isActive: true,
        expiryDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.order.aggregate({
      where: {
        sellerId: pharmacyId,
        status: { in: ["PAID", "SHIPPED"] },
      },
      _sum: { netAmount: true },
    }),
  ]);

  const pendingPayouts = pendingPayoutsResult._sum.netAmount ?? 0;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
          <p className="text-sm text-white/60">Active Listings</p>
          <p className="text-2xl font-bold text-gold mt-1">{activeListings}</p>
        </div>
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
          <p className="text-sm text-white/60">Orders this month</p>
          <p className="text-2xl font-bold text-gold mt-1">{ordersThisMonth}</p>
        </div>
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
          <p className="text-sm text-white/60">Your rating</p>
          <p className="text-xl font-bold text-gold mt-1">
            {pharmacy?.reviewCount && pharmacy.reviewCount > 0
              ? `⭐ ${(pharmacy.rating ?? 0).toFixed(1)}`
              : "No reviews yet"}
          </p>
        </div>
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
          <p className="text-sm text-white/60">Pending payouts</p>
          <p className="text-2xl font-bold text-gold mt-1">
            ${pendingPayouts.toFixed(2)}
          </p>
        </div>
      </div>

      {expiringCount > 0 ? (
        <div className="bg-warning/10 border border-warning/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-white/90">
            ⚠️ You have {expiringCount} listing{expiringCount === 1 ? "" : "s"} expiring within 90 days.
          </span>
          <Link
            href="/clearance"
            className="text-gold font-medium hover:underline shrink-0"
          >
            View Clearance Listings →
          </Link>
        </div>
      ) : (
        <div className="bg-mid-navy/60 border border-[rgba(161,130,65,0.15)] rounded-xl p-4">
          <span className="text-white/70 text-sm">No listings expiring in the next 90 days.</span>
        </div>
      )}
    </>
  );
}
