import { prisma } from "@/lib/prisma";
import { formatOrderQuantityLabel } from "@/lib/listing-units";
import Link from "next/link";
import { format } from "date-fns";

const BUYER_CAN_RATE = new Set(["PAID", "SHIPPED", "DELIVERED"]);

export default async function DashboardOrders({ pharmacyId }: { pharmacyId: string }) {
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyerId: pharmacyId }, { sellerId: pharmacyId }] },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      listing: { select: { productName: true, packSize: true } },
      buyer: { select: { name: true } },
      seller: { select: { name: true } },
      reviews: { select: { reviewerId: true } },
    },
  });

  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg text-white">Recent orders</h2>
        {orders.length > 0 && (
          <Link href="/orders" className="text-sm text-gold hover:underline">
            View all
          </Link>
        )}
      </div>
      {orders.length === 0 ? (
        <p className="text-white/60 text-sm">No orders yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const isPurchase = o.buyerId === pharmacyId;
            const buyerRated = o.reviews?.some((r) => r.reviewerId === pharmacyId) ?? false;
            const showRateSeller =
              isPurchase && BUYER_CAN_RATE.has(o.status) && !buyerRated;
            return (
              <li key={o.id}>
                <div className="hover:bg-white/5 -mx-2 px-2 py-1.5 rounded-lg transition">
                  <Link href={`/orders#order-${o.id}`} className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-white/90">
                      {o.listing?.productName ?? "—"} ·{" "}
                      {formatOrderQuantityLabel(o.listing?.packSize, o.quantity)}
                    </span>
                    <span className="text-white/60">
                      {isPurchase ? `From ${o.seller.name}` : `To ${o.buyer.name}`}
                    </span>
                    <span className="w-full text-xs text-white/50">
                      {o.status} · {format(new Date(o.createdAt), "d MMM yyyy")}
                    </span>
                  </Link>
                  {showRateSeller && (
                    <Link
                      href={`/orders#order-${o.id}`}
                      className="mt-1.5 inline-flex text-xs font-semibold text-gold hover:underline"
                    >
                      ⭐ Rate the seller
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
