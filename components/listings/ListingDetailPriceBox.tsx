"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useCart } from "@/components/providers/CartContext";
import { differenceInDays } from "date-fns";
import { getDeliveryOption } from "@/lib/deliveryOptions";
import {
  getListingQuoteResult,
  CHECKOUT_BLOCKED_PLATFORM_FEE_CODE,
} from "@/lib/pricing";
import { validateProposedPricePerPack } from "@/lib/validators";
import { unitPriceExGstFromPackPrice, effectivePackSize } from "@/lib/listing-units";
import PriceInsightPanel from "@/components/price-intelligence/PriceInsightPanel";
import {
  isPerUnitListing,
  listingBuyerAvailabilityLine,
  listingPrimaryPriceExGstLabel,
  listingSecondaryPriceExGstLine,
} from "@/lib/listing-price-display";

function NegotiateWithSellerButton({
  listingId,
  productName,
  listedPrice,
  packSize,
}: {
  listingId: string;
  productName: string;
  listedPrice: number;
  packSize?: number;
}) {
  const [open, setOpen] = useState(false);
  const [proposedPrice, setProposedPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const perUnit = isPerUnitListing(packSize);
  const basisLabel = perUnit ? "unit" : "pack";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = proposedPrice.trim() === "" ? NaN : parseFloat(proposedPrice.trim());
    const validation = validateProposedPricePerPack(price);
    if (!validation.success) {
      alert(validation.error);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposedPricePerPack: validation.data,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.message ?? "Failed to send offer");
        setLoading(false);
        return;
      }
      setOpen(false);
      setProposedPrice("");
      setMessage("");
      alert(data.message ?? "Offer sent. Check Messages for the seller's response.");
    } catch {
      alert("Something went wrong");
    }
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full border border-[#C9A84C] text-[#C9A84C] py-3 rounded-md font-medium hover:bg-[#C9A84C] hover:text-[#0d1b2a] transition-colors"
      >
        💬 Negotiate with Seller
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="bg-mid-navy border border-[rgba(161,130,65,0.3)] rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading font-bold text-gold mb-1">Negotiate with Seller</h3>
            <p className="text-white/70 text-sm mb-4">{productName}</p>
            <p className="text-white/60 text-xs mb-3">
              Listed: ${listedPrice.toFixed(2)}/{basisLabel} (ex GST). Suggest your price below.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Your offer per {basisLabel} (ex GST) *
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={proposedPrice}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setProposedPrice(v);
                  }}
                  placeholder={listedPrice.toFixed(2)}
                  className="w-full px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">Message (optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  rows={2}
                  className="w-full px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold"
                  placeholder={
                    perUnit
                      ? "e.g. I can commit to 50 units at this price"
                      : "e.g. I can commit to 10 packs at this price"
                  }
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gold text-[#0d1b2a] py-2.5 rounded-lg font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send offer"}
                </button>
                <button
                  type="button"
                  onClick={() => !loading && setOpen(false)}
                  className="px-4 py-2.5 border border-white/30 text-white/80 rounded-lg hover:bg-white/5 disabled:opacity-50"
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

type Pharmacy = {
  id: string;
  name: string;
  suburb: string;
  state: string;
  rating: number;
  reviewCount: number;
  tradeCount: number;
  createdAt: string;
  isVerified: boolean;
  stripeAccountId?: string | null;
};

type Listing = {
  id: string;
  productName: string;
  pricePerPack: number;
  originalRRP: number | null;
  quantityUnits: number;
  availableUnits?: number;
  /** When availableUnits omitted, used with quantityUnits to compute availability. */
  reservedUnits?: number;
  packSize?: number;
  isActive: boolean;
  fulfillmentType: string;
  deliveryFee?: number;
  pharmacyId: string;
  pharmacy: Pharmacy;
  /** FIXED = no offers; NEGOTIABLE = buyers can send offers. If missing, treat as NEGOTIABLE. */
  priceType?: string;
  /** Drives tax: true = GST-free, false = taxable, null = REVIEW_REQUIRED (10%). Must match checkout. */
  isGstFree?: boolean | null;
  expiryDate?: string | Date;
};

type Props = {
  listing: Listing;
  session: { user: { id: string; isVerified?: boolean } } | null;
  onBuyNow: (quantity: number) => void;
  /** When set, this buyer has an accepted offer — show and use this price (only for this buyer). */
  acceptedPricePerPack?: number;
};

function stockAvailabilityMessage(
  maxUnits: number,
  packSz: number
): string {
  const packs = Math.floor(maxUnits / packSz);
  if (packSz > 1 && packs >= 1) {
    const rem = maxUnits % packSz;
    return rem > 0
      ? `${maxUnits} units (${packs} full pack${packs !== 1 ? "s" : ""} of ${packSz} + ${rem} unit${rem !== 1 ? "s" : ""})`
      : `${maxUnits} units (${packs} pack${packs !== 1 ? "s" : ""} of ${packSz})`;
  }
  return `${maxUnits} unit${maxUnits !== 1 ? "s" : ""}`;
}

export default function ListingDetailPriceBox({ listing, session, onBuyNow, acceptedPricePerPack }: Props) {
  const { addItem, items: cartItems } = useCart();
  const listedTotal = Math.max(0, listing.quantityUnits ?? 0);
  const availableNow =
    typeof listing.availableUnits === "number"
      ? Math.max(0, listing.availableUnits)
      : Math.max(0, listedTotal - (listing.reservedUnits ?? 0));
  /** Units buyer can purchase now (never inflate to 1 when stock is reserved). */
  const maxUnits = availableNow;
  const pricePerPackListed = acceptedPricePerPack ?? listing.pricePerPack;
  const packSz = effectivePackSize(listing.packSize ?? 1);
  /** Full sealed packs that can be sold from current stock. */
  const fullPacksAvailable = Math.floor(maxUnits / packSz);
  const maxPacks = Math.max(1, fullPacksAvailable);
  const canBuyFullPacks = packSz > 1 && fullPacksAvailable >= 1;
  /** Show unit vs pack choice whenever listing is sold in multi-unit packs. */
  const showUnitVsPackChoice = packSz > 1;

  const [purchaseMode, setPurchaseMode] = useState<"units" | "packs">(() => {
    const ps = effectivePackSize(listing.packSize ?? 1);
    const listed = Math.max(0, listing.quantityUnits ?? 0);
    const avail =
      typeof listing.availableUnits === "number"
        ? Math.max(0, listing.availableUnits)
        : Math.max(0, listed - (listing.reservedUnits ?? 0));
    return ps > 1 && Math.floor(avail / ps) >= 1 ? "packs" : "units";
  });
  const [unitQty, setUnitQty] = useState(1);
  const [packQty, setPackQty] = useState(1);

  useEffect(() => {
    if (maxUnits < 1) return;
    if (unitQty > maxUnits) setUnitQty(maxUnits);
    if (unitQty < 1) setUnitQty(1);
  }, [maxUnits, unitQty]);

  useEffect(() => {
    if (fullPacksAvailable >= 1) {
      if (packQty > fullPacksAvailable) setPackQty(fullPacksAvailable);
      if (packQty < 1) setPackQty(1);
    }
  }, [fullPacksAvailable, packQty]);

  const effectiveUnits =
    maxUnits < 1
      ? 0
      : purchaseMode === "packs" && canBuyFullPacks
        ? packQty * packSz
        : unitQty;

  const unitExGst = unitPriceExGstFromPackPrice(pricePerPackListed, listing.packSize ?? 1);
  const deliveryFeeExGst = listing.deliveryFee ?? 0;
  const quoteResult = getListingQuoteResult({
    unitPriceExGst: unitExGst,
    quantity: maxUnits >= 1 ? effectiveUnits : 1,
    deliveryFeeExGst,
    isGstFree: listing.isGstFree ?? null,
  });
  const quote = quoteResult.allowed ? quoteResult.quote : quoteResult.quoteForDisplay;
  const checkoutBlocked = !quoteResult.allowed;
  const { subtotalExGst, gstAmount: gst, totalCharged: totalIncGst, platformFee, rateLabel } = quote;
  const discountPct = listing.originalRRP
    ? Math.round((1 - pricePerPackListed / listing.originalRRP) * 100)
    : null;

  const singleUnitQr = getListingQuoteResult({
    unitPriceExGst: unitExGst,
    quantity: 1,
    deliveryFeeExGst: 0,
    isGstFree: listing.isGstFree ?? null,
  });
  const onePackQr = getListingQuoteResult({
    unitPriceExGst: unitExGst,
    quantity: Math.max(1, packSz),
    deliveryFeeExGst: 0,
    isGstFree: listing.isGstFree ?? null,
  });
  const unitBasisQuote = singleUnitQr.allowed ? singleUnitQr.quote : singleUnitQr.quoteForDisplay;
  const packBasisQuote = onePackQr.allowed ? onePackQr.quote : onePackQr.quoteForDisplay;
  const unitIncGstDisplay = unitBasisQuote.totalCharged;
  const packIncGstDisplay = packBasisQuote.totalCharged;
  const taxTag =
    unitBasisQuote.taxClassification === "GST_FREE" ? "(GST-free)" : "(inc GST)";
  const secondaryExLine = listingSecondaryPriceExGstLine(pricePerPackListed, listing.packSize);
  const reservedForAvailabilityLine =
    listing.reservedUnits ?? Math.max(0, listedTotal - availableNow);

  const isSeller = session?.user?.id === listing.pharmacyId;
  /** On "By full pack" but stock &lt; one pack — must switch to units. */
  const packTabBlocked = purchaseMode === "packs" && !canBuyFullPacks;
  const alreadyInCart =
    cartItems.find((i) => i.listingId === listing.id)?.quantity ?? 0;
  const maxCanAddToCart = Math.max(0, maxUnits - alreadyInCart);
  const canBuy =
    maxUnits >= 1 &&
    session?.user?.id &&
    session.user.isVerified &&
    !isSeller &&
    listing.isActive &&
    !!listing.pharmacy.stripeAccountId &&
    !checkoutBlocked &&
    !packTabBlocked;

  const daysUntilExpiry =
    listing.expiryDate != null
      ? differenceInDays(new Date(listing.expiryDate), new Date())
      : null;

  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6 sticky top-6 space-y-4">
      {acceptedPricePerPack != null && (
        <p className="text-xs font-medium text-success bg-success/15 border border-success/30 rounded px-2 py-1 inline-block">
          ✓ Your agreed price
        </p>
      )}
      <p className="text-2xl font-bold text-gold">{listingPrimaryPriceExGstLabel(pricePerPackListed, listing.packSize)}</p>
      {secondaryExLine && <p className="text-sm text-white/70">{secondaryExLine}</p>}
      <p className="text-sm text-white/70">
        {listingBuyerAvailabilityLine(maxUnits, listing.packSize, {
          listedTotal,
          reservedUnits: reservedForAvailabilityLine,
        })}
      </p>
      {maxUnits < 1 && listedTotal >= 1 && (
        <p className="text-xs text-white/50">
          Checkout holds expire after 10 minutes if payment isn&apos;t completed. Your cart also
          clears after 10 minutes without changes.
        </p>
      )}
      {maxUnits >= 1 && packSz <= 1 && (
        <p className="text-sm text-white/60">
          You can buy 1–{maxUnits} units at the listed unit price.
          {listedTotal > maxUnits ? " Shown above is what's free to purchase now." : ""}
        </p>
      )}
      {maxUnits < 1 && listedTotal < 1 && <p className="text-sm text-white/50">Out of stock.</p>}
      {listing.priceType === "NEGOTIABLE" && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30" title="Price is negotiable — you can send an offer">
          <span className="relative flex h-2 w-3.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-pulse" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ml-0.5" />
          </span>
          Negotiable
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <PriceInsightPanel
          listingId={listing.id}
          currentPrice={unitExGst}
          viewAs={isSeller ? "seller" : "buyer"}
          isOwner={isSeller}
          priceType={listing.priceType === "FIXED" ? "FIXED" : listing.priceType === "NEGOTIABLE" ? "NEGOTIABLE" : undefined}
          daysUntilExpiry={daysUntilExpiry}
          buttonLabel={isSeller ? undefined : "💡 Price Insight"}
        />
      </div>
      <p className="text-sm text-white/60">
        {packSz <= 1 ? (
          <>
            ${unitIncGstDisplay.toFixed(3)} / unit {taxTag}
          </>
        ) : (
          <>
            ${packIncGstDisplay.toFixed(2)} / pack {taxTag}
            <span className="block text-xs mt-0.5 text-white/50">
              ${unitIncGstDisplay.toFixed(3)} / unit {taxTag}
            </span>
          </>
        )}
      </p>
      {listing.originalRRP != null && discountPct != null && (
        <p className="text-sm text-success">
          <span className="line-through text-white/60">${listing.originalRRP.toFixed(2)} RRP</span> -{discountPct}% off
        </p>
      )}

      {showUnitVsPackChoice && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-white/80 uppercase tracking-wide">
            How do you want to buy?
          </p>
          <div className="flex rounded-lg border-2 border-[rgba(201,168,76,0.35)] p-0.5 bg-white/5">
            <button
              type="button"
              onClick={() => {
                if (purchaseMode === "packs" && canBuyFullPacks) {
                  setUnitQty((u) => Math.min(maxUnits, Math.max(1, packQty * packSz)));
                }
                setPurchaseMode("units");
              }}
              className={`flex-1 py-2.5 px-2 text-sm font-semibold rounded-md transition ${
                purchaseMode === "units"
                  ? "bg-gold text-[#0d1b2a] shadow"
                  : "text-white/80 hover:text-white"
              }`}
            >
              By unit quantity
            </button>
            <button
              type="button"
              onClick={() => {
                if (purchaseMode === "units" && canBuyFullPacks) {
                  if (unitQty >= packSz) {
                    setPackQty(
                      Math.min(
                        fullPacksAvailable,
                        Math.max(1, Math.floor(unitQty / packSz))
                      )
                    );
                  } else {
                    setPackQty(1);
                  }
                }
                setPurchaseMode("packs");
              }}
              className={`flex-1 py-2.5 px-2 text-sm font-semibold rounded-md transition ${
                purchaseMode === "packs"
                  ? "bg-gold text-[#0d1b2a] shadow"
                  : "text-white/80 hover:text-white"
              }`}
            >
              By full pack
            </button>
          </div>
          <p className="text-xs text-white/50">
            {purchaseMode === "units"
              ? maxUnits >= 1
                ? `Enter any number of units (1–${maxUnits}). Priced per unit from the pack rate.`
                : "No units available to add right now."
              : canBuyFullPacks
                ? `Each pack = ${packSz} units at $${pricePerPackListed.toFixed(2)}/pack (ex GST).`
                : `A full pack is ${packSz} units. Stock is only ${maxUnits} unit${maxUnits !== 1 ? "s" : ""} — buy by unit quantity instead.`}
          </p>
        </div>
      )}

      {purchaseMode === "units" || !showUnitVsPackChoice ? (
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Number of units
          </label>
          {maxUnits >= 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUnitQty((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded border border-white/20 bg-white/5 flex items-center justify-center font-medium text-white hover:bg-white/10 disabled:opacity-50"
                disabled={unitQty <= 1}
              >
                −
              </button>
              <span className="w-12 text-center font-medium text-white">{unitQty}</span>
              <button
                type="button"
                onClick={() => {
                  if (unitQty >= maxUnits) {
                    toast.warning(
                      `Not available at a higher quantity. ${maxUnits} unit${maxUnits !== 1 ? "s" : ""} available now (${listedTotal} listed total).`
                    );
                    return;
                  }
                  setUnitQty((q) => q + 1);
                }}
                className="w-10 h-10 rounded border border-white/20 bg-white/5 flex items-center justify-center font-medium text-white hover:bg-white/10 disabled:opacity-50"
                disabled={unitQty >= maxUnits}
              >
                +
              </button>
            </div>
          ) : (
            <p className="text-sm text-white/45">—</p>
          )}
        </div>
      ) : canBuyFullPacks ? (
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Number of full packs
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPackQty((p) => Math.max(1, p - 1))}
              className="w-10 h-10 rounded border border-white/20 bg-white/5 flex items-center justify-center font-medium text-white hover:bg-white/10 disabled:opacity-50"
              disabled={packQty <= 1}
            >
              −
            </button>
            <span className="w-12 text-center font-medium text-white">{packQty}</span>
            <button
              type="button"
              onClick={() => {
                if (packQty >= fullPacksAvailable) {
                  toast.warning(
                    `Not available. Only ${fullPacksAvailable} full pack${fullPacksAvailable !== 1 ? "s" : ""} (${fullPacksAvailable * packSz} units) listed.`
                  );
                  return;
                }
                setPackQty((p) => p + 1);
              }}
              className="w-10 h-10 rounded border border-white/20 bg-white/5 flex items-center justify-center font-medium text-white hover:bg-white/10 disabled:opacity-50"
              disabled={packQty >= fullPacksAvailable}
            >
              +
            </button>
          </div>
          <p className="text-xs text-white/50 mt-1.5">
            {packQty} pack{packQty !== 1 ? "s" : ""} × {packSz} units ={" "}
            <strong className="text-white/80">{effectiveUnits} units</strong> · $
            {(pricePerPackListed * packQty).toFixed(2)} ex GST (product only)
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-medium">Full packs not available</p>
          <p className="mt-1 text-amber-200/90">
            One pack = {packSz} units. Use <strong>By unit quantity</strong> above to buy the{" "}
            {maxUnits} unit{maxUnits !== 1 ? "s" : ""} in stock.
          </p>
        </div>
      )}

      <div className="border-t border-white/10 pt-3 space-y-1 text-sm">
        <div className="pb-2">
          <p className="text-white/80 font-medium">Delivery: {getDeliveryOption(listing.fulfillmentType).label}</p>
          <p className="text-white/50 text-xs mt-0.5">{getDeliveryOption(listing.fulfillmentType).description}</p>
          {deliveryFeeExGst > 0 && (
            <p className="text-white/70 text-xs mt-1">Delivery fee: ${deliveryFeeExGst.toFixed(2)} (ex GST)</p>
          )}
        </div>
        {maxUnits >= 1 ? (
          <>
            <p className="flex justify-between text-white/90">
              <span className="text-white/60">Subtotal (ex GST):</span>
              <span>${subtotalExGst.toFixed(2)}</span>
            </p>
            {deliveryFeeExGst > 0 && (
              <p className="flex justify-between text-white/90">
                <span className="text-white/60">Delivery fee (ex GST):</span>
                <span>${deliveryFeeExGst.toFixed(2)}</span>
              </p>
            )}
            <p className="flex justify-between text-white/90">
              <span className="text-white/60">{rateLabel}:</span>
              <span>${gst.toFixed(2)}</span>
            </p>
            <p className="flex justify-between font-semibold text-white">
              <span>Total{quote.taxClassification === "GST_FREE" ? "" : " (inc GST)"}:</span>
              <span>${totalIncGst.toFixed(2)}</span>
            </p>
            <p className="text-white/60 text-xs mt-2">
              Platform fee: 3.5% of product (ex GST), min $1.50 — not charged on delivery or GST. Fee: $
              {platformFee.toFixed(2)} — deducted from seller payout.
            </p>
          </>
        ) : (
          <p className="text-white/50 text-sm py-2">Pricing shown when units are available to purchase.</p>
        )}
      </div>

      <div className="space-y-2">
        {checkoutBlocked ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            {!quoteResult.allowed && quoteResult.code === CHECKOUT_BLOCKED_PLATFORM_FEE_CODE ? (
              <>
                <p className="font-medium">{quoteResult.reason}</p>
                <p className="text-white/70 text-xs mt-1">
                  Minimum platform fee applies per sale; increase price or quantity so the total covers fees.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">
                  This item cannot be purchased yet because GST classification is pending review.
                </p>
                <p className="text-white/70 text-xs mt-1">
                  The seller must set GST status (taxable or GST-free) before checkout is available.
                </p>
              </>
            )}
          </div>
        ) : !session ? (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`}
            className="block w-full bg-primary text-[#0d1b2a] py-3 rounded-md font-medium text-center hover:bg-primary/90"
          >
            Sign in to buy
          </Link>
        ) : !session.user.isVerified ? (
          <p className="text-center text-sm text-warning py-2">Your account is pending verification</p>
        ) : isSeller ? (
          <p className="text-center text-sm text-white/60 py-2">This is your listing</p>
        ) : !listing.isActive ? (
          <p className="text-center text-sm text-white/60 py-2">This listing is no longer available</p>
        ) : !listing.pharmacy.stripeAccountId ? (
          <p className="text-center text-sm text-white/60 py-2">Seller has not connected payments yet</p>
        ) : packTabBlocked ? (
          <p className="text-center text-sm text-amber-200 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3">
            Choose <strong>By unit quantity</strong> to buy — not enough stock for a full pack.
          </p>
        ) : maxUnits < 1 ? (
          <p className="text-center text-sm text-white/55 py-3 px-2 rounded-lg border border-white/10 bg-white/5">
            Purchase is paused until stock is free — checkout holds last at most 10 minutes.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (alreadyInCart + effectiveUnits > maxUnits) {
                  toast.warning(
                    `Not available at this quantity. ${stockAvailabilityMessage(maxUnits, packSz)} listed. Your cart already has ${alreadyInCart} unit${alreadyInCart !== 1 ? "s" : ""} of this item — you can add up to ${maxCanAddToCart} more.`
                  );
                  return;
                }
                onBuyNow(effectiveUnits);
              }}
              className="w-full bg-primary text-white py-3 rounded-md font-medium hover:bg-primary/90"
            >
              🛒 Buy Now
            </button>
            <button
              type="button"
              onClick={() => {
                if (effectiveUnits > maxCanAddToCart) {
                  toast.warning(
                    alreadyInCart > 0
                      ? `Not available at this quantity. ${stockAvailabilityMessage(maxUnits, packSz)} listed; you already have ${alreadyInCart} in cart. Maximum you can add now: ${maxCanAddToCart} unit${maxCanAddToCart !== 1 ? "s" : ""}.`
                      : `Not available at this quantity. Seller has only ${stockAvailabilityMessage(maxUnits, packSz)} listed.`
                  );
                  return;
                }
                addItem(listing.id, effectiveUnits);
                const packPart =
                  purchaseMode === "packs" && canBuyFullPacks
                    ? `${packQty} pack${packQty !== 1 ? "s" : ""} (${effectiveUnits} units)`
                    : `${effectiveUnits} unit${effectiveUnits !== 1 ? "s" : ""}`;
                toast.success(
                  `${packPart} added to cart. Same-seller items ship together at checkout.`
                );
              }}
              className="w-full border border-white/30 text-white py-3 rounded-md font-medium hover:bg-white/10"
            >
              Add to cart
            </button>
            {listing.priceType !== "FIXED" && !acceptedPricePerPack && (
              <NegotiateWithSellerButton
                listingId={listing.id}
                productName={listing.productName}
                listedPrice={pricePerPackListed}
                packSize={listing.packSize}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
