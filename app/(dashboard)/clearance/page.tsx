import { prisma } from "@/lib/prisma";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";
import Link from "next/link";
import ClearanceCard from "@/components/listings/ClearanceCard";

export const dynamic = "force-dynamic";

export default async function ClearancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysFilter } = await searchParams;
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  const where: Record<string, unknown> = {
    isClearance: true,
    ...listingBuyableByOthersWhere(),
  };
  if (daysFilter === "under30") {
    where.expiryDate = { gte: now, lte: new Date(now.getTime() + 30 * day) };
  } else if (daysFilter === "30-60") {
    where.expiryDate = { gte: new Date(now.getTime() + 30 * day), lte: new Date(now.getTime() + 60 * day) };
  } else if (daysFilter === "60-90") {
    where.expiryDate = { gte: new Date(now.getTime() + 60 * day), lte: new Date(now.getTime() + 90 * day) };
  }

  const listings = await prisma.listing.findMany({
    where,
    orderBy: { expiryDate: "asc" },
    take: 48,
    include: { pharmacy: { select: { name: true, rating: true, reviewCount: true, tradeCount: true, isVerified: true } } },
  });

  const tabs = [
    { key: "", label: "All" },
    { key: "under30", label: "< 30 days 🔴" },
    { key: "30-60", label: "30–60 days 🟠" },
    { key: "60-90", label: "60–90 days 🟡" },
  ];

  return (
    <div>
      <div className="bg-mid-navy border border-[rgba(161,130,65,0.25)] rounded-xl p-5 mb-6">
        <h1 className="text-2xl font-heading font-bold text-gold">
          <span className="text-error">🔴</span> Expiry Clearance — Recover Value Before Stock Expires
        </h1>
        <p className="text-white/70 mt-1">Listings expiring within 90 days. Default sort: soonest expiry first.</p>
      </div>
      <div className="flex w-full gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <Link
            key={t.key || "all"}
            href={t.key ? `/clearance?days=${t.key}` : "/clearance"}
            className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-medium transition text-center ${
              daysFilter === t.key
                ? "bg-gold text-[#0D1B2A]"
                : "bg-white/5 border border-[rgba(161,130,65,0.25)] text-white/80 hover:bg-white/10 hover:border-gold/40"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {listings.length === 0 ? (
        <p className="text-white/70">No clearance listings in this range.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <ClearanceCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
