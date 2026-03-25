"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import OrderCard from "@/components/orders/OrderCard";
import { useCart } from "@/components/providers/CartContext";
import { parseOrderShippingMeta } from "@/lib/order-shipping";

type Order = {
  id: string;
  listingId: string | null;
  wantedOfferId?: string | null;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  deliveryFee?: number;
  platformFee: number;
  gstAmount: number;
  netAmount: number;
  status: string;
  fulfillmentType: string;
  trackingNumber: string | null;
  courierName: string | null;
  sellerNotes?: string | null;
  createdAt: string;
  listing: { productName: string; strength: string | null; packSize?: number } | null;
  wantedOffer?: { wantedItem: { productName: string; strength: string | null } } | null;
  buyer: { id: string; name: string; isVerified: boolean; address?: string; suburb?: string; state?: string; postcode?: string; abn?: string };
  seller: { id: string; name: string; isVerified: boolean; address?: string; suburb?: string; state?: string; postcode?: string; abn?: string };
  reviews?: { id: string; reviewerId: string; subjectId: string }[];
};

type Props = {
  success: string | null;
};

export default function OrdersPageClient({ success }: Props) {
  const { clearCart, removeItems } = useCart();
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"purchases" | "sales">("purchases");
  const [shippingFilter, setShippingFilter] = useState<"all" | "platform" | "direct">("all");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders?type=all", { cache: "no-store" });
      if (res.ok) {
        const { purchases: p, sales: s } = await res.json();
        setPurchases(Array.isArray(p) ? p : []);
        setSales(Array.isArray(s) ? s : []);
      }
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith("order-")) return;
    const el = document.getElementById(hash);
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }, [loading, purchases, sales, tab]);

  useEffect(() => {
    if (success !== "true" || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromCart = params.get("from") === "cart";
    const paymentIntentId = params.get("payment_intent");

    (async () => {
      if (paymentIntentId?.startsWith("pi_")) {
        try {
          const r = await fetch("/api/orders/reconcile-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId }),
          });
          const data = await r.json().catch(() => ({}));
          if (r.ok) {
            if (data.message && !String(data.message).includes("Already synced")) {
              toast.success(data.message);
            }
            const ids = Array.isArray(data.purchasedListingIds)
              ? (data.purchasedListingIds as string[])
              : [];
            if (!fromCart && ids.length > 0) {
              removeItems(ids);
            }
          } else if (r.status !== 200) {
            console.warn("[orders] reconcile:", data?.message);
            toast.error(
              data?.message ??
                "Order may still be processing. Wait a minute and refresh, or contact support with your Stripe receipt."
            );
          }
        } catch {
          toast.error("Could not confirm order sync. Refresh in a moment.");
        }
        await loadOrders();
      } else {
        toast.success("Payment confirmed! Your order is being prepared.");
      }
      if (fromCart) clearCart();
      window.history.replaceState({}, "", "/orders");
    })();
  }, [success, clearCart, removeItems, loadOrders]);

  const orders = tab === "purchases" ? purchases : sales;
  const visibleOrders = orders.filter((order) => {
    if (shippingFilter === "all") return true;
    const meta = parseOrderShippingMeta(order.sellerNotes ?? null);
    const isDirect = meta.shippingArrangement === "direct_contact";
    return shippingFilter === "direct" ? isDirect : !isDirect;
  });

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-heading font-bold text-gold mb-2">My orders</h1>
      <p className="text-white/55 text-sm mb-6 max-w-2xl">
        After payment, you can <strong className="text-white/75">Rate the seller</strong> on each purchase. Ratings appear on
        all of that seller&apos;s listings.
      </p>

      <div className="flex w-full gap-2 border-b border-[rgba(161,130,65,0.25)] mb-6">
        <button
          type="button"
          onClick={() => setTab("purchases")}
          className={`flex-1 min-w-0 px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors text-center ${
            tab === "purchases"
              ? "border-gold text-gold"
              : "border-transparent text-white/60 hover:text-white/90"
          }`}
        >
          🛒 Purchases
        </button>
        <button
          type="button"
          onClick={() => setTab("sales")}
          className={`flex-1 min-w-0 px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors text-center ${
            tab === "sales"
              ? "border-gold text-gold"
              : "border-transparent text-white/60 hover:text-white/90"
          }`}
        >
          📦 Sales
        </button>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShippingFilter("all")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            shippingFilter === "all"
              ? "border-gold/60 bg-gold/15 text-gold"
              : "border-white/20 text-white/70 hover:text-white/90"
          }`}
        >
          All shipping
        </button>
        <button
          type="button"
          onClick={() => setShippingFilter("platform")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            shippingFilter === "platform"
              ? "border-gold/60 bg-gold/15 text-gold"
              : "border-white/20 text-white/70 hover:text-white/90"
          }`}
        >
          Platform shipping
        </button>
        <button
          type="button"
          onClick={() => setShippingFilter("direct")}
          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            shippingFilter === "direct"
              ? "border-gold/60 bg-gold/15 text-gold"
              : "border-white/20 text-white/70 hover:text-white/90"
          }`}
        >
          Direct shipping
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-1/3 mb-3" />
              <div className="h-4 bg-white/10 rounded w-2/3 mb-2" />
              <div className="h-4 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : visibleOrders.length === 0 ? (
        <p className="text-white/70">
          {shippingFilter === "all"
            ? tab === "purchases"
              ? "You haven't placed any orders yet."
              : "You have no sales yet."
            : "No orders match this shipping filter."}
        </p>
      ) : (
        <div className="space-y-4">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              viewAs={tab === "purchases" ? "buyer" : "seller"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
