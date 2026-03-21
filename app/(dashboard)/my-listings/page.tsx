import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import ListingRowActions from "@/components/my-listings/ListingRowActions";
import ClearListingHoldsButton from "@/components/my-listings/ClearListingHoldsButton";
import { reconcileListingReservedUnits } from "@/lib/listing-reservation";
import { activeAcceptedListingNegotiationWhere } from "@/lib/listing-negotiation-hold";
import { isPerUnitListing } from "@/lib/listing-price-display";

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const pharmacyId = (session?.user as { id?: string })?.id;
  if (!pharmacyId) redirect("/login");

  const { filter = "all" } = await searchParams;
  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const includeNegotiations = {
    negotiations: { where: activeAcceptedListingNegotiationWhere(), select: { id: true } },
  };
  let all = await prisma.listing.findMany({
    where: { pharmacyId },
    orderBy: { createdAt: "desc" },
    include: includeNegotiations,
  });
  const stuckIds = all.filter((l) => l.reservedUnits > 0).map((l) => l.id);
  if (stuckIds.length > 0) {
    await Promise.all(stuckIds.map((id) => reconcileListingReservedUnits(id)));
    all = await prisma.listing.findMany({
      where: { pharmacyId },
      orderBy: { createdAt: "desc" },
      include: includeNegotiations,
    });
  }

  const listings = all.map(({ negotiations, ...l }) => ({ ...l, isPending: negotiations.length > 0 })).filter((l) => {
    const exp = new Date(l.expiryDate);
    const isExpired = exp < now;
    const isExpiringSoon = exp >= now && exp <= ninetyDays && l.isActive;
    if (filter === "active") return l.isActive && !isExpired;
    if (filter === "sold") return l.quantityUnits === 0 || !l.isActive;
    if (filter === "expiring") return isExpiringSoon;
    if (filter === "expired") return isExpired;
    return true;
  });

  const tabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "sold", label: "Sold" },
    { key: "expiring", label: "Expiring soon" },
    { key: "expired", label: "Expired" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gold mb-6">My listings</h1>
      <Link
        href="/sell"
        className="inline-block bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2.5 rounded-xl font-bold hover:opacity-90 mb-4"
      >
        + List a product
      </Link>
      <div className="flex w-full gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/my-listings" : `/my-listings?filter=${t.key}`}
            className={`flex-1 min-w-0 px-3 py-1.5 rounded-lg text-sm font-medium transition text-center ${
              filter === t.key
                ? "bg-gold text-[#0D1B2A]"
                : "bg-white/5 border border-[rgba(161,130,65,0.25)] text-white/80 hover:bg-white/10 hover:border-gold/40"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {listings.length === 0 ? (
        <p className="text-white/70">
          No listings in this filter. <Link href="/sell" className="text-gold font-medium hover:underline">Create one</Link>.
        </p>
      ) : (
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(161,130,65,0.2)]">
                <th className="text-left p-3 text-sm font-medium text-white/80">Product</th>
                <th className="text-left p-3 text-sm font-medium text-white/80">Qty</th>
                <th className="text-left p-3 text-sm font-medium text-white/80">Expiry</th>
                <th className="text-left p-3 text-sm font-medium text-white/80">Price</th>
                <th className="text-left p-3 text-sm font-medium text-white/80">Views</th>
                <th className="text-left p-3 text-sm font-medium text-white/80">Status</th>
                <th className="text-left p-3 text-sm font-medium text-white/80">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(161,130,65,0.15)]">
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="p-3 text-white/90">{l.productName}</td>
                  <td className="p-3 text-white/90">
                    {l.quantityUnits} units
                    {l.quantityUnits > 0 && l.reservedUnits >= l.quantityUnits ? (
                      <span className="block mt-1 max-w-[16rem]">
                        <span
                          className="text-xs text-amber-400/90"
                          title="Buy Items hides listings when every unit is reserved for an open checkout."
                        >
                          Hidden on Buy Items: all units in checkout
                        </span>
                        <ClearListingHoldsButton listingId={l.id} />
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 text-white/80">{format(new Date(l.expiryDate), "MMM yyyy")}</td>
                  <td className="p-3 text-gold font-medium">
                    <span className="block">${l.pricePerPack.toFixed(2)}</span>
                    <span className="block text-xs text-white/50 font-normal">
                      {isPerUnitListing(l.packSize) ? "per unit (ex GST)" : "per pack (ex GST)"}
                    </span>
                  </td>
                  <td className="p-3 text-white/60">{l.viewCount}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        l.quantityUnits === 0
                          ? "bg-white/10 text-white/70"
                          : l.isPending
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : l.isActive
                              ? "bg-success/20 text-success"
                              : "bg-white/10 text-white/70"
                      }`}
                    >
                      {l.quantityUnits === 0 ? "Sold" : l.isPending ? "Pending" : l.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <ListingRowActions id={l.id} isActive={l.isActive} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
