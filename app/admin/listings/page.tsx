import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import PriceInsightPanel from "@/components/price-intelligence/PriceInsightPanel";

export const dynamic = "force-dynamic";

export default async function AdminListingsPage() {
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      pharmacy: { select: { name: true, email: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gold mb-6">
        All listings
      </h1>
      {listings.length === 0 ? (
        <p className="text-white/70">No listings.</p>
      ) : (
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-white/90">Product</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Pharmacy</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Qty</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Price</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Status</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Created</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="p-3 text-white/90">{l.productName}</td>
                  <td className="p-3">
                    <span className="text-white/90">{l.pharmacy.name}</span>
                    <span className="text-white/60 text-xs block">
                      {l.pharmacy.email}
                    </span>
                  </td>
                  <td className="p-3 text-white/90">{l.quantityUnits} u</td>
                  <td className="p-3 text-gold">${l.pricePerPack.toFixed(2)}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        l.isActive ? "bg-success/20 text-success" : "bg-white/10 text-white/60"
                      }`}
                    >
                      {l.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-white/80">{format(new Date(l.createdAt), "dd MMM yyyy")}</td>
                  <td className="p-3 relative">
                    <div className="flex flex-col gap-1 items-start">
                      <Link
                        href={`/listings/${l.id}`}
                        className="text-gold text-sm hover:underline"
                      >
                        View
                      </Link>
                      <PriceInsightPanel
                        listingId={l.id}
                        currentPrice={l.pricePerPack}
                        viewAs="seller"
                        priceType={l.priceType === "FIXED" ? "FIXED" : l.priceType === "NEGOTIABLE" ? "NEGOTIABLE" : undefined}
                        overlay
                      />
                    </div>
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
