"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type Negotiation = {
  id: string;
  proposedPricePerPack: number;
  message: string | null;
  status: string;
  createdAt: string;
  listing: {
    id: string;
    productName: string;
    pricePerPack: number;
    quantityUnits: number;
    isActive: boolean;
  };
  buyer: {
    id: string;
    name: string;
    isVerified: boolean;
    state: string;
  };
};

export default function DashboardNegotiations() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/account/negotiations")
      .then((res) => res.json())
      .then((data) => {
        setNegotiations(Array.isArray(data) ? data : []);
      })
      .catch(() => setNegotiations([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(negotiationId: string, listingId: string, action: "accept" | "reject") {
    setActing(negotiationId);
    try {
      const res = await fetch(`/api/listings/${listingId}/negotiations/${negotiationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.message ?? "Failed");
        setActing(null);
        return;
      }
      setNegotiations((prev) => prev.filter((n) => n.id !== negotiationId));
      router.refresh();
    } catch {
      alert("Something went wrong");
    }
    setActing(null);
  }

  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
      <h2 className="font-heading font-semibold text-lg text-white mb-4">Price offers (negotiations)</h2>
      {loading ? (
        <p className="text-white/60 text-sm">Loading…</p>
      ) : negotiations.length === 0 ? (
        <p className="text-white/60 text-sm">No pending offers. Buyers can send offers from a listing page via &quot;Negotiate with Seller&quot;.</p>
      ) : (
        <ul className="space-y-4">
          {negotiations.map((n) => (
            <li
              key={n.id}
              className="border border-white/10 rounded-lg p-3 bg-white/5"
            >
              <p className="text-white/90 font-medium">{n.listing.productName}</p>
              <p className="text-sm text-white/70 mt-0.5">
                <span className="text-gold font-medium">{n.buyer.name}</span>
                {n.buyer.isVerified && " ✓"} · {n.buyer.state}
              </p>
              <p className="text-sm text-white/80 mt-1">
                Buyer offers: <span className="text-gold">${n.proposedPricePerPack.toFixed(2)}/pack</span>
                {" "}(your listed: ${n.listing.pricePerPack.toFixed(2)})
              </p>
              {n.message && (
                <p className="text-xs text-white/60 mt-1 italic">&quot;{n.message}&quot;</p>
              )}
              <p className="text-xs text-white/50 mt-1">{format(new Date(n.createdAt), "d MMM yyyy, HH:mm")}</p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => handleAction(n.id, n.listing.id, "accept")}
                  disabled={!!acting}
                  className="text-xs bg-success/20 text-success px-3 py-1.5 rounded-lg hover:bg-success/30 disabled:opacity-50 font-medium"
                >
                  {acting === n.id ? "…" : "Accept"}
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(n.id, n.listing.id, "reject")}
                  disabled={!!acting}
                  className="text-xs bg-error/20 text-error px-3 py-1.5 rounded-lg hover:bg-error/30 disabled:opacity-50 font-medium"
                >
                  {acting === n.id ? "…" : "Reject"}
                </button>
                <Link
                  href={`/listings/${n.listing.id}`}
                  className="text-xs text-gold hover:underline ml-auto self-center"
                >
                  View listing →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
