"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type PriceInsightPanelProps = {
  listingId?: string;
  productName?: string;
  currentPrice: number;
  viewAs: "seller" | "buyer";
  className?: string;
  /** When viewAs="seller" and listingId is set, show "Apply this price" only if true */
  isOwner?: boolean;
  /** When FIXED, seller view does not show a suggested price or "Apply this price" */
  priceType?: "FIXED" | "NEGOTIABLE";
  /** For wanted product-only mode: reference price (e.g. offer price or maxPrice) */
  referencePrice?: number | null;
  /** When true, open panel is absolutely positioned (e.g. for admin table) */
  overlay?: boolean;
  /** For buyer view: days until expiry of the listing being viewed (shows urgency tag if < 60) */
  daysUntilExpiry?: number | null;
  /** Override button label (e.g. "💡 Price Insight" on buy grid, "💡 Negotiation Insight" on wanted offers) */
  buttonLabel?: string;
};

type PriceIntelligenceResult = {
  productName: string;
  supplierData: {
    productName: string;
    supplierRRP: number;
    wholesaleCost: number;
    lastUpdated: string;
    source: string;
  } | null;
  marketListings: Array<{
    listingId: string;
    price: number;
    quantity: number;
    daysUntilExpiry: number | null;
    condition: string;
    pharmacyName: string;
  }>;
  suggestedSellerPrice: number;
  suggestedBuyerOffer: number;
  sellerReasoning: string;
  buyerReasoning: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  isMock: true;
};

const confidenceClass = {
  HIGH: "bg-success/20 text-success",
  MEDIUM: "bg-amber-500/20 text-amber-400",
  LOW: "bg-white/10 text-white/70",
};

export default function PriceInsightPanel({
  listingId,
  productName: productNameProp,
  currentPrice,
  viewAs,
  className = "",
  isOwner = false,
  priceType,
  referencePrice,
  overlay = false,
  daysUntilExpiry,
  buttonLabel: buttonLabelProp,
}: PriceInsightPanelProps) {
  const isFixedPriceSeller = viewAs === "seller" && priceType === "FIXED";
  const isFixedPriceBuyer = viewAs === "buyer" && priceType === "FIXED";
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PriceIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (data) return;
    if (listingId && isFixedPriceBuyer) return;
    setLoading(true);
    setError(null);
    try {
      if (listingId) {
        const res = await fetch(`/api/listings/${listingId}/price-intelligence`, {
          next: { revalidate: 300 },
        });
        if (!res.ok) {
          if (res.status === 401) setError("Please sign in.");
          else if (res.status === 404) setError("Listing not found.");
          else setError("Price data unavailable right now.");
          return;
        }
        const json = await res.json();
        setData(json);
      } else if (productNameProp) {
        const params = new URLSearchParams({ productName: productNameProp });
        if (referencePrice != null && Number.isFinite(referencePrice)) {
          params.set("referencePrice", String(referencePrice));
        }
        const res = await fetch(`/api/wanted/price-intelligence?${params.toString()}`, {
          next: { revalidate: 300 },
        });
        if (!res.ok) {
          if (res.status === 401) setError("Please sign in.");
          else setError("Price data unavailable right now.");
          return;
        }
        const json = await res.json();
        setData(json);
      } else {
        setError("Missing listing or product.");
      }
    } catch {
      setError("Price data unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, [listingId, productNameProp, referencePrice, data, isFixedPriceBuyer]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchData();
  };

  const handleClose = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleApplyPrice = async () => {
    if (!listingId || !data) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricePerPack: data.suggestedSellerPrice }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? "Failed to update price");
        setApplying(false);
        return;
      }
      setData((prev) =>
        prev ? { ...prev, suggestedSellerPrice: data.suggestedSellerPrice } : null
      );
      router.refresh();
    } catch {
      setError("Failed to update price");
    }
    setApplying(false);
  };

  const defaultLabel =
    viewAs === "seller"
      ? productNameProp && !listingId
        ? "💡 Market Price"
        : "💡 Price Insight"
      : "💡 Negotiation Insight";
  const label = buttonLabelProp ?? defaultLabel;

  const buttonClass =
    "text-xs px-2 py-1 rounded border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#0d1b2a] transition-colors font-medium";

  const overlayContent = open && (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Price insight"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-auto rounded-xl border border-[rgba(161,130,65,0.18)] bg-mid-navy shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {(loading || (error && !loading)) && !(isFixedPriceBuyer && open) && (
          <div className="flex items-start justify-end gap-3 p-4 border-b border-white/10">
            {loading && (
              <div className="flex-1 space-y-3">
                <div className="h-3 bg-white/10 rounded animate-pulse w-full" />
                <div className="h-3 bg-white/10 rounded animate-pulse w-4/5" />
                <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
              </div>
            )}
            {error && !loading && <p className="flex-1 text-sm text-amber-200">{error}</p>}
            <button
              type="button"
              onClick={handleClose}
              className="flex-shrink-0 w-8 h-8 rounded border border-white/20 text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-center text-lg font-bold transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        {(data && !loading) || (isFixedPriceBuyer && open) ? (
          <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {isFixedPriceBuyer ? (
                    <h4 className="font-semibold text-white">💡 Price Insight</h4>
                  ) : viewAs === "seller" ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-white">
                        {isFixedPriceSeller ? "💡 Price Insight" : "💡 Suggested Price"}
                      </h4>
                      {!isFixedPriceSeller && data && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${confidenceClass[data.confidence]}`}
                        >
                          {data.confidence}
                        </span>
                      )}
                    </div>
                  ) : (
                    <h4 className="font-semibold text-white">💡 Negotiation Insight</h4>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-shrink-0 w-7 h-7 rounded border border-white/20 text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-center text-sm font-bold transition-colors"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              {isFixedPriceBuyer ? (
                <p className="mt-2 text-white/90">The price is fixed. Pay the listed price.</p>
              ) : viewAs === "seller" ? (
                <>
                  {isFixedPriceSeller ? (
                    <p className="mt-2 text-sm text-white/80">
                      You&apos;ve set a fixed price — no price suggestion. Market context below (for reference only).
                    </p>
                  ) : !data ? null : (
                    <>
                      <p className="mt-2 text-xl font-bold text-gold">
                        ${data.suggestedSellerPrice.toFixed(2)}
                        {currentPrice !== data.suggestedSellerPrice && (
                          <span className="ml-2 text-sm font-normal text-white/50 line-through">
                            ${currentPrice.toFixed(2)}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-white/70 mt-1 font-medium">Why this price:</p>
                      <p className="text-xs text-white/60 mt-0.5 break-words whitespace-normal">{data.sellerReasoning}</p>
                  {data.marketListings.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs border border-white/10 rounded">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="text-left p-1.5 text-white/80">Pharmacy</th>
                            <th className="text-left p-1.5 text-white/80">Price</th>
                            <th className="text-left p-1.5 text-white/80">Qty</th>
                            <th className="text-left p-1.5 text-white/80">Expiry</th>
                            <th className="text-left p-1.5 text-white/80">Condition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.marketListings.slice(0, 5).map((m) => (
                            <tr
                              key={m.listingId}
                              className={
                                listingId && m.listingId === listingId
                                  ? "bg-gold/15"
                                  : ""
                              }
                            >
                              <td className="p-1.5 text-white/90">{m.pharmacyName}</td>
                              <td className="p-1.5 text-white/90">${m.price.toFixed(2)}</td>
                              <td className="p-1.5 text-white/90">{m.quantity}</td>
                              <td className="p-1.5 text-white/90">
                                {m.daysUntilExpiry != null
                                  ? `${m.daysUntilExpiry}d`
                                  : "—"}
                              </td>
                              <td className="p-1.5 text-white/90">{m.condition}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {data.supplierData && (
                    <p className="text-xs text-white/60 mt-2">
                      Supplier RRP: ${data.supplierData.supplierRRP.toFixed(2)} (
                      {data.supplierData.source})
                    </p>
                  )}
                  {listingId && isOwner && !isFixedPriceSeller && (
                    <button
                      type="button"
                      onClick={handleApplyPrice}
                      disabled={applying}
                      className="mt-3 w-full text-sm font-medium bg-gold text-[#0d1b2a] py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {applying ? "Applying…" : "Apply this price"}
                    </button>
                  )}
                    </>
                  )}
                </>
              ) : !data ? null : (
                <>
                  <p className="mt-2 text-xl font-bold text-gold">
                    Suggested offer: ${data.suggestedBuyerOffer.toFixed(2)}
                  </p>
                  <p className="text-sm text-success mt-1">
                    Save $
                    {(currentPrice - data.suggestedBuyerOffer).toFixed(2)} (
                    {Math.round(
                      (1 - data.suggestedBuyerOffer / currentPrice) * 100
                    )}
                    % below ask)
                  </p>
                  <p className="text-xs text-white/70 mt-1 font-medium">Market context:</p>
                  <p className="text-xs text-white/60 mt-0.5 break-words whitespace-normal">{data.buyerReasoning}</p>
                  {(daysUntilExpiry != null && daysUntilExpiry < 60) ||
                  data.marketListings.some(
                    (m) => m.daysUntilExpiry != null && m.daysUntilExpiry < 60
                  ) ? (
                    <p className="mt-2 text-xs px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 inline-block">
                      ⏱ Stock expires soon — seller is motivated
                    </p>
                  ) : null}
                  {data.marketListings.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-xs border border-white/10 rounded">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="text-left p-1.5 text-white/80">Pharmacy</th>
                            <th className="text-left p-1.5 text-white/80">Price</th>
                            <th className="text-left p-1.5 text-white/80">Qty</th>
                            <th className="text-left p-1.5 text-white/80">Expiry</th>
                            <th className="text-left p-1.5 text-white/80">Condition</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.marketListings.slice(0, 5).map((m) => (
                            <tr key={m.listingId}>
                              <td className="p-1.5 text-white/90">{m.pharmacyName}</td>
                              <td className="p-1.5 text-white/90">${m.price.toFixed(2)}</td>
                              <td className="p-1.5 text-white/90">{m.quantity}</td>
                              <td className="p-1.5 text-white/90">
                                {m.daysUntilExpiry != null
                                  ? `${m.daysUntilExpiry}d`
                                  : "—"}
                              </td>
                              <td className="p-1.5 text-white/90">{m.condition}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {!isFixedPriceBuyer && (
                <p className="mt-3 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded p-2">
                  ⚠️ Pricing data is illustrative only. Supplier API integration coming
                  soon.
                </p>
              )}
            </div>
          ) : null}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={buttonClass}
        aria-expanded={open}
      >
        {label}
      </button>
      {typeof document !== "undefined" && createPortal(overlayContent, document.body)}
    </div>
  );
}
