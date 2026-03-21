"use client";

import { useState } from "react";
import { toast } from "sonner";
import PriceInsightPanel from "@/components/price-intelligence/PriceInsightPanel";

type Item = {
  id: string;
  productName: string;
  strength: string | null;
  quantity: number;
  maxPrice: number | null;
  quantityKind?: string | null;
  /** When PACK: units in each pack (buyer’s pack size) */
  unitsPerPack?: number | null;
};

const inputClass =
  "w-full px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";
const labelClass = "block text-sm font-medium text-white/80 mb-1";

export default function MakeOfferModal({
  item,
  triggerLabel = "Make offer →",
  trigger,
  onSuccess,
}: {
  item: Item;
  triggerLabel?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isUnit = item.quantityKind === "UNIT";
  const [quantity, setQuantity] = useState(item.quantity);
  const [pricePerPack, setPricePerPack] = useState(item.maxPrice != null ? String(item.maxPrice) : "");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    const price = pricePerPack ? parseFloat(String(pricePerPack).trim()) : NaN;
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("Enter a valid quantity (at least 1)");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error(isUnit ? "Enter a valid price per unit" : "Enter a valid price per pack");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/wanted/${item.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: qty,
          ...(isUnit
            ? { pricePerUnit: price }
            : { pricePerPack: price }),
          ...(message.trim() ? { message: message.trim().slice(0, 500) } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to submit offer");
        setLoading(false);
        return;
      }
      toast.success("Offer sent. The pharmacy will accept or decline.");
      setOpen(false);
      setMessage("");
      onSuccess?.();
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(true)}>
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-gold text-sm font-medium hover:underline"
        >
          {triggerLabel}
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !loading && setOpen(false)}>
          <div
            className="bg-mid-navy border border-[rgba(161,130,65,0.3)] rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading font-bold text-gold mb-2">Make an offer</h3>
            <p className="text-white/70 text-sm mb-1">{item.productName}</p>
            {!isUnit && item.unitsPerPack != null && item.unitsPerPack >= 1 && (
              <p className="text-white/50 text-xs mb-4">
                Buyer wants up to {item.quantity} pack{item.quantity !== 1 ? "s" : ""} of{" "}
                {item.unitsPerPack} units each ({item.quantity * item.unitsPerPack} units total).
              </p>
            )}
            {isUnit && (
              <p className="text-white/50 text-xs mb-4">Buyer wants {item.quantity} unit{item.quantity !== 1 ? "s" : ""}.</p>
            )}
            {!isUnit && (item.unitsPerPack == null || item.unitsPerPack < 1) && (
              <p className="text-white/50 text-xs mb-4">Buyer wants {item.quantity} pack{item.quantity !== 1 ? "s" : ""}.</p>
            )}
            <div className="mb-4">
              <PriceInsightPanel
                productName={item.productName}
                currentPrice={item.maxPrice ?? 0}
                viewAs="seller"
                referencePrice={item.maxPrice}
                buttonLabel="💡 Negotiation Insight"
              />
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={labelClass}>
                  Quantity ({isUnit ? "units" : "packs"})
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Your price per {isUnit ? "unit" : "pack"} (ex GST) *
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={pricePerPack}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setPricePerPack(v);
                  }}
                  placeholder="0.00"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  rows={2}
                  className={inputClass}
                  placeholder="e.g. Available for pickup this week"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send offer"}
                </button>
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  className="px-4 py-2.5 border border-[rgba(161,130,65,0.4)] text-white/80 rounded-xl hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
