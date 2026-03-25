"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import ListingImage from "@/components/listings/ListingImage";
import { format } from "date-fns";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getDeliveryOption } from "@/lib/deliveryOptions";
import { getListingQuoteResult, CHECKOUT_BLOCKED_PLATFORM_FEE_CODE } from "@/lib/pricing";
import {
  unitPriceExGstFromPackPrice,
  effectivePackSize,
  formatUnitPriceExGstDisplay,
  lineTotalExGstFromUnits,
} from "@/lib/listing-units";
import { isPerUnitListing, listingPackContextLine } from "@/lib/listing-price-display";
import { isValidAustralianPostcodeForShipping } from "@/lib/australian-postcode";
import { quoteSellerCart } from "@/lib/cart-checkout-quote";
import { useAppTheme } from "@/components/providers/AppThemeProvider";
import type { TransdirectQuoteOption } from "@/lib/transdirect";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Pharmacy = {
  id: string;
  name: string;
  suburb: string;
  state: string;
  postcode?: string | null;
  rating: number;
  reviewCount: number;
  tradeCount: number;
  createdAt: string;
  isVerified: boolean;
  stripeAccountId?: string | null;
  phone?: string | null;
  approvalNumber?: string | null;
};

type AusPostRate = TransdirectQuoteOption;

type Listing = {
  id: string;
  productName: string;
  pricePerPack: number;
  originalRRP: number | null;
  quantityUnits: number;
  availableUnits?: number;
  isActive: boolean;
  fulfillmentType: string;
  deliveryFee?: number;
  pharmacyId: string;
  pharmacy: Pharmacy;
  /** Drives tax: true = GST-free, false = taxable, null = REVIEW_REQUIRED (10%). Must match checkout. */
  isGstFree?: boolean | null;
  // Optional fields for the buy card display
  images?: string[];
  genericName?: string | null;
  brand?: string | null;
  strength?: string | null;
  form?: string | null;
  packSize?: number;
  expiryDate?: string | Date;
  condition?: string;
  noteToPurchasers?: string | null;
};

type Props = {
  onClose: () => void;
  /** Single listing checkout (listing detail page) */
  listing?: Listing;
  quantity?: number;
  acceptedPricePerPack?: number;
  /** Same-seller cart: multiple lines, same Buy UI as single checkout */
  cartLines?: Array<{ listing: Listing; quantity: number; acceptedPricePerPack?: number }>;
};

function PaymentForm({
  listing,
  quantity,
  onClose,
  totalCharged,
  fromCart,
}: {
  listing: Listing;
  quantity: number;
  onClose: () => void;
  totalCharged: number;
  /** Cart multi-item checkout: return URL clears cart */
  fromCart?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);
    try {
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: fromCart
            ? `${window.location.origin}/orders?success=true&from=cart`
            : `${window.location.origin}/orders?success=true`,
        },
      });
      if (confirmError) {
        setError(confirmError.message ?? "Payment failed");
        setLoading(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">
        Select the attached bank account or payment method to use for this purchase.
      </p>
      <div className="border-t border-gray-200 pt-4 mt-4">
        <PaymentElement />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || !elements || loading}
            className={
              theme === "light"
                ? "px-4 py-2 bg-[#c026d3] text-white rounded-md font-medium hover:opacity-90 disabled:opacity-50"
                : "px-4 py-2 bg-[#c9a84c] text-[#0d1b2a] rounded-md font-medium hover:opacity-90 disabled:opacity-50"
            }
          >
            {loading ? "Processing…" : "Agree and Purchase"}
          </button>
        </div>
        {!fromCart && (
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900 underline text-center"
          >
            Make counter offer
          </button>
        )}
      </div>
    </form>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right font-medium">{value}</span>
    </div>
  );
}

type ShippingTier = "standard" | "express";

// Shipping tier fees (buyer pays). Express is a fixed uplift when standard is set.
function getShippingOptions(deliveryFee: number) {
  const standard = deliveryFee;
  const express = deliveryFee > 0 ? deliveryFee + 15 : 15;
  return { standard, express };
}

const COURIER_LABELS: Record<string, string> = {
  aramex: "Aramex",
  couriers_please: "Couriers Please",
  allied: "Allied",
  mainfreight: "Mainfreight",
  northline: "Northline",
  toll: "Toll",
  toll_priority: "Toll Priority",
  toll_priority_overnight: "Toll Priority Overnight",
  toll_priority_sameday: "Toll Priority Same Day",
  tnt_nine_express: "TNT 9AM",
  tnt_ten_express: "TNT 10AM",
  tnt_twelve_express: "TNT 12PM",
  tnt_overnight_express: "TNT Overnight Express",
  tnt_road_express: "TNT Road Express",
  direct_couriers_regular: "Direct Couriers Regular",
  direct_couriers_elite: "Direct Couriers Elite",
  go_people: "Go People",
  capital_transport: "Capital Transport",
  capital_transport_express: "Capital Transport Express",
  hunter_road_freight: "Hunter Road Freight",
  direct_couriers: "Direct Couriers",
  direct_couriers_express: "Direct Couriers Express",
};

function formatCourierName(raw?: string): string {
  if (!raw) return "Courier";
  return (
    COURIER_LABELS[raw] ??
    raw
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function BuyNowModalInner({
  onClose,
  listing,
  quantity = 1,
  acceptedPricePerPack,
  cartLines,
}: Props) {
  const { theme } = useAppTheme();
  const isCartCheckout = Boolean(cartLines && cartLines.length > 0);
  const rows = useMemo(
    () =>
      isCartCheckout
        ? cartLines!
        : [{ listing: listing!, quantity, acceptedPricePerPack }],
    [isCartCheckout, cartLines, listing, quantity, acceptedPricePerPack]
  );
  const primary = rows[0].listing;
  const cartConfigError =
    isCartCheckout &&
    (rows.some((r) => r.listing.pharmacyId !== primary.pharmacyId) ||
      rows.some((r) => r.listing.fulfillmentType !== primary.fulfillmentType))
      ? "Items must be from the same seller with the same delivery type to check out together."
      : null;

  const pricePerPack = rows[0].acceptedPricePerPack ?? rows[0].listing.pricePerPack;
  const unitPriceExGst = unitPriceExGstFromPackPrice(
    pricePerPack,
    primary.packSize ?? 1
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shipByDate, setShipByDate] = useState<string>("");
  const [shippingTier, setShippingTier] = useState<ShippingTier>("standard");
  const [arrangeFreightDirectly, setArrangeFreightDirectly] = useState(false);
  const [useAustraliaPost, setUseAustraliaPost] = useState(false);
  /** Buyer delivery postcode — filled from account (seller → buyer lane). */
  const [buyerPostcode, setBuyerPostcode] = useState("");
  const [buyerDeliverySuburb, setBuyerDeliverySuburb] = useState<string | null>(null);
  const [buyerDeliveryState, setBuyerDeliveryState] = useState<string | null>(null);
  const [buyerProfileLoading, setBuyerProfileLoading] = useState(true);
  const [auspostRates, setAuspostRates] = useState<AusPostRate[]>([]);
  const [auspostLoading, setAuspostLoading] = useState(false);
  const [auspostError, setAuspostError] = useState<string | null>(null);
  const [selectedAusPostRate, setSelectedAusPostRate] = useState<AusPostRate | null>(null);
  const auspostRequestId = useRef(0);

  const baseDeliveryFee = isCartCheckout
    ? Math.max(...rows.map((r) => r.listing.deliveryFee ?? 0), 0)
    : primary.deliveryFee ?? 0;
  const { standard: standardFee, express: expressFee } = getShippingOptions(baseDeliveryFee);
  const deliveryFeeFromListing = shippingTier === "express" ? expressFee : standardFee;
  const deliveryFeeExGst = arrangeFreightDirectly
    ? 0
    : useAustraliaPost
    ? (selectedAusPostRate?.totalPrice ?? 0)
    : deliveryFeeFromListing;

  const allowCustomDelivery = Boolean(
    useAustraliaPost &&
      primary.fulfillmentType === "NATIONAL_SHIPPING" &&
      isValidAustralianPostcodeForShipping(
        primary.pharmacy.postcode?.trim().replace(/\D/g, "").slice(0, 4) ?? ""
      )
  );

  const singleQuoteResult = getListingQuoteResult({
    unitPriceExGst,
    quantity: rows[0].quantity,
    deliveryFeeExGst,
    isGstFree: primary.isGstFree ?? null,
  });
  const cartQuoteResult = quoteSellerCart(
    rows.map((r) => ({
      listingId: r.listing.id,
      quantity: r.quantity,
      unitPriceExGst: unitPriceExGstFromPackPrice(
        r.acceptedPricePerPack ?? r.listing.pricePerPack,
        r.listing.packSize ?? 1
      ),
      isGstFree: r.listing.isGstFree ?? null,
    })),
    deliveryFeeExGst,
    shippingTier,
    rows.map((r) => ({ id: r.listing.id, deliveryFee: r.listing.deliveryFee })),
    { allowCustomDelivery }
  );

  const awaitingAuspost =
    allowCustomDelivery &&
    useAustraliaPost &&
    (!selectedAusPostRate || auspostLoading);

  const gstPending = rows.some((r) => r.listing.isGstFree === null);
  const checkoutBlocked =
    Boolean(cartConfigError) ||
    gstPending ||
    (isCartCheckout
      ? !cartQuoteResult.ok || awaitingAuspost
      : !singleQuoteResult.allowed || awaitingAuspost);
  const cartQuoteErr =
    isCartCheckout && !cartQuoteResult.ok ? cartQuoteResult.message : null;

  const quote = isCartCheckout
    ? cartQuoteResult.ok
      ? {
          subtotalExGst: cartQuoteResult.grossTotal + cartQuoteResult.deliveryFeeExGst,
          totalCharged: cartQuoteResult.totalCharged,
          gstAmount: cartQuoteResult.gstAmount,
          platformFee: cartQuoteResult.platformFeeTotal,
          netToSeller: cartQuoteResult.netToSeller,
          rateLabel:
            cartQuoteResult.taxClassification === "GST_FREE" ? "GST" : "GST (10%)",
        }
      : {
          subtotalExGst: 0,
          totalCharged: 0,
          gstAmount: 0,
          platformFee: 0,
          netToSeller: 0,
          rateLabel: "GST",
        }
    : singleQuoteResult.allowed
      ? singleQuoteResult.quote
      : singleQuoteResult.quoteForDisplay;

  const visibleTransdirectRates = (() => {
    if (!Array.isArray(auspostRates) || auspostRates.length === 0) return [];
    const sorted = [...auspostRates].sort((a, b) => a.totalPrice - b.totalPrice);
    const cheapest = sorted[0]?.totalPrice ?? 0;
    const outlierCap = cheapest > 0 ? cheapest * 3 : Number.POSITIVE_INFINITY;
    const withinRange = sorted.filter((r) => r.totalPrice <= outlierCap);
    const capped = (withinRange.length > 0 ? withinRange : sorted).slice(0, 6);
    return capped;
  })();

  const { totalCharged, gstAmount: gst, platformFee, netToSeller: sellerReceives, rateLabel } =
    quote;
  const delivery = getDeliveryOption(primary.fulfillmentType);

  const pharmacyName = primary.pharmacy.name;
  const firstImage = primary.images?.[0];
  const expiryDate = primary.expiryDate
    ? format(new Date(primary.expiryDate), "MM.dd.yyyy")
    : null;
  const conditionLabel =
    primary.condition === "SEALED"
      ? "Sealed"
      : primary.condition === "OPENED"
        ? "Opened"
        : primary.condition ?? "—";

  const sellerPostcode = primary.pharmacy.postcode?.trim().replace(/\D/g, "").slice(0, 4) ?? "";
  const sellerPostcodeValid = isValidAustralianPostcodeForShipping(sellerPostcode);
  const canUseAustraliaPost =
    primary.fulfillmentType === "NATIONAL_SHIPPING" && sellerPostcodeValid;

  /** Load buyer’s registered address (delivery destination). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBuyerProfileLoading(true);
      try {
        const res = await fetch("/api/account/profile");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          postcode?: string;
          suburb?: string;
          state?: string;
        };
        if (cancelled) return;
        const pc = String(data.postcode ?? "")
          .replace(/\D/g, "")
          .slice(0, 4);
        if (pc.length >= 4) setBuyerPostcode(pc);
        setBuyerDeliverySuburb(data.suburb ?? null);
        setBuyerDeliveryState(data.state ?? null);
      } catch {
        /* keep empty — fallback UI below */
      } finally {
        if (!cancelled) setBuyerProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAustraliaPostRates = useCallback(
    async (signal?: AbortSignal) => {
      const from = sellerPostcode;
      const to = buyerPostcode.trim().replace(/\D/g, "").slice(0, 4);
      if (from.length < 4 || to.length < 4) return;
      const reqId = ++auspostRequestId.current;
      setAuspostError(null);
      setAuspostLoading(true);
      setAuspostRates([]);
      setSelectedAusPostRate(null);
      try {
        const res = await fetch("/api/transdirect/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal,
          body: JSON.stringify({
            senderPostcode: from,
            senderSuburb: primary.pharmacy.suburb,
            senderState: primary.pharmacy.state,
            senderBuildingType: "commercial",
            receiverPostcode: to,
            receiverSuburb: buyerDeliverySuburb ?? undefined,
            receiverState: buyerDeliveryState ?? undefined,
            receiverBuildingType: "commercial",
            parcels: [{ weightKg: 1, lengthCm: 22, widthCm: 16, heightCm: 7 }],
            reference: primary.id,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (signal?.aborted || auspostRequestId.current !== reqId) return;
        if (!res.ok) {
          setAuspostError(data.message ?? "Could not get Transdirect rates.");
          return;
        }
        const services = Array.isArray(data.options) ? data.options : [];
        setAuspostRates(services);
        if (services.length > 0) setSelectedAusPostRate(services[0]);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (auspostRequestId.current !== reqId) return;
        setAuspostError("Something went wrong. Please try again.");
      } finally {
        if (auspostRequestId.current === reqId) setAuspostLoading(false);
      }
    },
    [sellerPostcode, buyerPostcode, primary.id, primary.pharmacy.suburb, primary.pharmacy.state, buyerDeliverySuburb, buyerDeliveryState]
  );

  /** When Australia Post is on, auto-fetch using seller + buyer account postcodes. */
  useEffect(() => {
    if (!useAustraliaPost || !canUseAustraliaPost || buyerProfileLoading) return;
    const to = buyerPostcode.replace(/\D/g, "").slice(0, 4);
    if (to.length < 4) {
      setAuspostError(
        "Add a valid Australian postcode to your pharmacy address in Settings to use live Australia Post rates."
      );
      setAuspostRates([]);
      setSelectedAusPostRate(null);
      return;
    }
    setAuspostError(null);
    const ac = new AbortController();
    loadAustraliaPostRates(ac.signal);
    return () => ac.abort();
  }, [
    useAustraliaPost,
    canUseAustraliaPost,
    buyerProfileLoading,
    buyerPostcode,
    sellerPostcode,
    loadAustraliaPostRates,
  ]);

  const cartItemsKey = rows.map((r) => `${r.listing.id}:${r.quantity}`).join("|");

  useEffect(() => {
    if (checkoutBlocked) {
      setLoading(false);
      setClientSecret(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setClientSecret(null);
      try {
        if (isCartCheckout) {
          const res = await fetch("/api/stripe/create-cart-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sellerId: primary.pharmacyId,
              items: rows.map((r) => ({
                listingId: r.listing.id,
                quantity: r.quantity,
              })),
              deliveryFee: deliveryFeeExGst,
              shippingTier,
              arrangeFreightDirectly,
              useAustraliaPost: allowCustomDelivery && useAustraliaPost,
              selectedShippingOption:
                allowCustomDelivery && useAustraliaPost && selectedAusPostRate
                  ? {
                      provider: "transdirect",
                      serviceName: selectedAusPostRate.serviceName,
                      courierName: selectedAusPostRate.courierName,
                      totalPrice: selectedAusPostRate.totalPrice,
                      currency: selectedAusPostRate.currency,
                      quoteReference: selectedAusPostRate.quoteReference,
                    }
                  : undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (!cancelled) setError(data.message ?? "Failed to start payment");
            if (!cancelled) setLoading(false);
            return;
          }
          if (!cancelled && data.clientSecret) setClientSecret(data.clientSecret);
        } else {
          const idempotencyKey = `pi-${primary.id}-${rows[0].quantity}-${deliveryFeeExGst}`;
          const res = await fetch("/api/stripe/create-payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              listingId: primary.id,
              quantity: rows[0].quantity,
              deliveryFee: deliveryFeeExGst,
              idempotencyKey,
              arrangeFreightDirectly,
              selectedShippingOption:
                allowCustomDelivery && useAustraliaPost && selectedAusPostRate
                  ? {
                      provider: "transdirect",
                      serviceName: selectedAusPostRate.serviceName,
                      courierName: selectedAusPostRate.courierName,
                      totalPrice: selectedAusPostRate.totalPrice,
                      currency: selectedAusPostRate.currency,
                      quoteReference: selectedAusPostRate.quoteReference,
                    }
                  : undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            if (!cancelled) setError(data.message ?? "Failed to start payment");
            if (!cancelled) setLoading(false);
            return;
          }
          if (!cancelled && data.clientSecret) setClientSecret(data.clientSecret);
        }
      } catch {
        if (!cancelled) setError("Something went wrong");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isCartCheckout,
    primary.pharmacyId,
    primary.id,
    rows,
    cartItemsKey,
    deliveryFeeExGst,
    checkoutBlocked,
    shippingTier,
    useAustraliaPost,
    allowCustomDelivery,
    selectedAusPostRate?.totalPrice,
    selectedAusPostRate?.quoteReference,
    auspostLoading,
  ]);

  const stripeAppearance =
    theme === "light"
      ? {
          theme: "stripe" as const,
          variables: {
            colorPrimary: "#c026d3",
            colorBackground: "#ffffff",
            colorText: "#171717",
            colorTextSecondary: "#525252",
            colorDanger: "#dc2626",
          },
        }
      : {
          theme: "night" as const,
          variables: {
            colorPrimary: "#c9a84c",
            colorBackground: "#0f172a",
            colorText: "#f8fafc",
            colorTextSecondary: "#94a3b8",
          },
        };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ colorScheme: theme === "light" ? "light" : "dark" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header: icon, title, close */}
        <div className="flex items-center justify-between gap-4 p-5 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shrink-0 text-white font-bold text-lg"
              aria-hidden
            >
              $
            </div>
            <h2
              id="buy-modal-title"
              className="font-heading font-semibold text-lg text-gray-900 truncate"
            >
              {isCartCheckout
                ? `Buy on GalaxRX — ${rows.length} item${rows.length !== 1 ? "s" : ""} from ${pharmacyName}`
                : `Buy on GalaxRX for ${pharmacyName}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Medication Details */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-3">
              {isCartCheckout ? "Items in this order" : "Medication Details"}
            </h3>
            {isCartCheckout ? (
              <ul className="space-y-4">
                {rows.map((r) => {
                  const img = r.listing.images?.[0];
                  const ppp = r.acceptedPricePerPack ?? r.listing.pricePerPack;
                  const ps = r.listing.packSize ?? 1;
                  const lineEx = lineTotalExGstFromUnits(ppp, ps, r.quantity);
                  return (
                    <li
                      key={r.listing.id}
                      className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-3 pb-4 border-b border-gray-100 last:border-0"
                    >
                      <div className="aspect-square rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                        {img ? (
                          <ListingImage
                            src={img}
                            alt={r.listing.productName}
                            fill={false}
                            width={100}
                            height={100}
                            className="object-contain w-full h-full max-w-full max-h-full"
                          />
                        ) : (
                          <span className="text-3xl text-gray-400">💊</span>
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-gray-900">{r.listing.productName}</p>
                        <p className="text-xs text-gray-500">
                          {isPerUnitListing(ps) ? (
                            <>${ppp.toFixed(2)}/unit (ex GST)</>
                          ) : (
                            <>
                              ${ppp.toFixed(2)}/pack (ex GST) · {effectivePackSize(ps)} units per pack · $
                              {formatUnitPriceExGstDisplay(ppp, ps)}/unit (ex GST)
                            </>
                          )}
                        </p>
                        <DetailRow label="Quantity (units)" value={String(r.quantity)} />
                        <DetailRow
                          label="Line total (ex GST)"
                          value={`${r.quantity} × $${formatUnitPriceExGstDisplay(ppp, ps)} = $${lineEx.toFixed(2)}`}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
                <div className="aspect-square rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  {firstImage ? (
                    <ListingImage
                      src={firstImage}
                      alt={primary.productName}
                      fill={false}
                      width={140}
                      height={140}
                      className="object-contain w-full h-full max-w-full max-h-full"
                    />
                  ) : (
                    <span className="text-4xl text-gray-400">💊</span>
                  )}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <p className="font-semibold text-gray-900">
                    {primary.productName}
                    {primary.brand ? ` - ${primary.brand}` : ""}
                  </p>
                  {primary.genericName && (
                    <DetailRow label="Generic description" value={primary.genericName} />
                  )}
                  <DetailRow
                    label="How it's sold"
                    value={listingPackContextLine(primary.packSize, primary.condition ?? "—")}
                  />
                  {primary.strength && (
                    <DetailRow label="Strength" value={primary.strength} />
                  )}
                  {primary.form && <DetailRow label="Form" value={primary.form} />}
                </div>
              </div>
            )}
          </section>

          {/* Listing Details */}
          <section>
            <h3 className="font-semibold text-gray-900 mb-3">Listing Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <p className="font-medium text-gray-900">Selling Pharmacy</p>
                <p className="text-gray-900">{primary.pharmacy.name}</p>
                {primary.pharmacy.approvalNumber && (
                  <DetailRow label="Approval No." value={primary.pharmacy.approvalNumber} />
                )}
                <DetailRow
                  label="City/State"
                  value={`${primary.pharmacy.suburb}/${primary.pharmacy.state}`}
                />
                {primary.pharmacy.phone && (
                  <DetailRow label="Phone" value={primary.pharmacy.phone} />
                )}
              </div>
              <div className="space-y-1.5">
                {!isCartCheckout && (
                  <>
                    <DetailRow label="Quantity (units)" value={String(rows[0].quantity)} />
                    {effectivePackSize(primary.packSize ?? 1) > 1 &&
                      rows[0].quantity >= effectivePackSize(primary.packSize ?? 1) && (
                        <DetailRow
                          label="Full packs"
                          value={`${Math.floor(rows[0].quantity / effectivePackSize(primary.packSize ?? 1))} × ${effectivePackSize(primary.packSize ?? 1)} units${
                            rows[0].quantity % effectivePackSize(primary.packSize ?? 1) > 0
                              ? ` + ${rows[0].quantity % effectivePackSize(primary.packSize ?? 1)} units`
                              : ""
                          }`}
                        />
                      )}
                    <DetailRow
                      label="Product total (ex GST)"
                      value={`$${(unitPriceExGst * rows[0].quantity).toFixed(2)}`}
                    />
                    {expiryDate && (
                      <DetailRow label="Expiration Date" value={expiryDate} />
                    )}
                    <DetailRow label="Condition" value={conditionLabel} />
                    {primary.noteToPurchasers ? (
                      <DetailRow label="Additional notes" value={primary.noteToPurchasers} />
                    ) : (
                      <DetailRow label="Additional notes" value="None" />
                    )}
                  </>
                )}
                {isCartCheckout && (
                  <p className="text-sm text-gray-600">
                    One payment and one shipment for all lines above. Delivery fee applies once.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Ship by Date (Optional) */}
          <section>
            <label className="block font-medium text-gray-900 mb-1">
              Ship by Date (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={shipByDate}
                onChange={(e) => setShipByDate(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#c9a84c] focus:outline-none focus:ring-1 focus:ring-[#c9a84c]"
              />
              <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              If the seller does not ship by this date, the order will be cancelled.
            </p>
          </section>

          {/* Shipping bundle info */}
          <div className="rounded-lg bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-800">
            If you buy another item from the same seller before they ship, you will have the option to add it to this shipment.
          </div>

          {/* Shipping options — buyer chooses platform or direct freight arrangement */}
          <section className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
            <h3 className="font-semibold text-gray-900 mb-1">Shipping options</h3>
            <p className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-3">
              Shipping cost is paid by you (the buyer).
            </p>
            <label className="flex items-center gap-2 cursor-pointer mb-3 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={arrangeFreightDirectly}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setArrangeFreightDirectly(checked);
                  if (checked) {
                    setUseAustraliaPost(false);
                    setSelectedAusPostRate(null);
                    setAuspostRates([]);
                    setAuspostError(null);
                  }
                }}
                className="rounded text-[#c9a84c] focus:ring-[#c9a84c]"
              />
              Arrange freight directly with seller (outside platform)
            </label>
            {arrangeFreightDirectly && (
              <div className="mb-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                Shipping fee will be <strong>$0.00</strong> in checkout. Buyer and seller will receive each
                other&apos;s contact details by email after payment to arrange freight directly.
              </div>
            )}

            {primary.fulfillmentType === "NATIONAL_SHIPPING" && !sellerPostcodeValid && (
              <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 text-sm">
                <p className="font-medium">Australia Post live rates unavailable for this listing</p>
                <p className="mt-1">
                  The seller’s pharmacy postcode on file is{" "}
                  <strong className="tabular-nums">{sellerPostcode || "—"}</strong>, which Australia Post does not
                  accept (e.g. <code className="text-xs bg-amber-100 px-1 rounded">0000</code> is invalid). Use{" "}
                  <strong>standard / express shipping</strong> below instead. If you are the seller, update your
                  postcode in{" "}
                  <a href="/settings" className="underline font-semibold">
                    Settings
                  </a>
                  .
                </p>
              </div>
            )}

            {canUseAustraliaPost && (
              <div className="mb-4 p-3 rounded-lg border border-sky-200 bg-sky-50/50 text-black">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={useAustraliaPost}
                    onChange={(e) => {
                      setUseAustraliaPost(e.target.checked);
                      if (!e.target.checked) {
                        setAuspostRates([]);
                        setSelectedAusPostRate(null);
                        setAuspostError(null);
                      }
                    }}
                    className="rounded text-[#c9a84c] focus:ring-[#c9a84c]"
                  />
                  <span className="font-medium text-black">Use Transdirect (live courier rates)</span>
                </label>
                {useAustraliaPost && (
                  <div className="mt-2 space-y-2">
                    {buyerProfileLoading && (
                      <p className="text-sm text-sky-900">Loading your registered delivery address…</p>
                    )}
                    {!buyerProfileLoading && buyerPostcode.length >= 4 && (
                      <div className="text-sm text-sky-900 space-y-1">
                        <p>
                          <span className="font-medium">From</span> seller postcode{" "}
                          <strong className="tabular-nums">{sellerPostcode}</strong>
                          {" → "}
                          <span className="font-medium">to</span> your pharmacy{" "}
                          {buyerDeliverySuburb && buyerDeliveryState ? (
                            <>
                              <strong>
                                {buyerDeliverySuburb}, {buyerDeliveryState}
                              </strong>{" "}
                            </>
                          ) : null}
                          <strong className="tabular-nums">{buyerPostcode}</strong>
                          .
                        </p>
                        <p className="text-xs text-sky-800/90">
                          Rates use Australia Post’s from/to postcode lanes. Update your address in{" "}
                          <a href="/settings" className="underline font-medium hover:text-sky-950">
                            Settings
                          </a>{" "}
                          if this is wrong.
                        </p>
                      </div>
                    )}
                    {!buyerProfileLoading && buyerPostcode.length < 4 && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                        <p className="font-medium mb-1">No valid postcode on your account</p>
                        <p className="mb-2">
                          Add your pharmacy address (including postcode) in{" "}
                          <a href="/settings" className="underline font-semibold">
                            Settings
                          </a>
                          , then reopen checkout.
                        </p>
                        <p className="text-xs text-amber-900/90 mb-2">Or enter a delivery postcode once:</p>
                        <div className="flex gap-2 flex-wrap items-center">
                          <input
                            type="text"
                            placeholder="Postcode"
                            value={buyerPostcode}
                            onChange={(e) =>
                              setBuyerPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))
                            }
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm w-32 bg-white text-black"
                            maxLength={4}
                            inputMode="numeric"
                          />
                          <button
                            type="button"
                            onClick={() => loadAustraliaPostRates()}
                            disabled={auspostLoading || buyerPostcode.trim().length < 4}
                            className="px-3 py-1.5 text-sm font-medium rounded-md bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                          >
                            {auspostLoading ? "Loading…" : "Get rates"}
                          </button>
                        </div>
                      </div>
                    )}
                    {buyerPostcode.length >= 4 && auspostLoading && (
                      <p className="text-sm text-sky-800">Fetching Transdirect rates…</p>
                    )}
                    {buyerPostcode.length >= 4 && !auspostLoading && auspostRates.length === 0 && !auspostError && (
                      <button
                        type="button"
                        onClick={() => loadAustraliaPostRates()}
                        className="text-sm text-sky-700 underline font-medium hover:text-sky-900"
                      >
                        Refresh rates
                      </button>
                    )}
                    {auspostError && (
                      <p className="text-sm text-red-600">{auspostError}</p>
                    )}
                    {auspostRates.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-sm font-medium text-black">Select service:</p>
                        {visibleTransdirectRates.map((rate) => (
                          <label
                            key={rate.quoteReference ?? `${rate.courierName ?? "courier"}-${rate.serviceName}`}
                            className="flex items-center gap-3 cursor-pointer text-black"
                          >
                            <input
                              type="radio"
                              name="auspost-service"
                              checked={
                                (selectedAusPostRate?.quoteReference &&
                                  selectedAusPostRate.quoteReference === rate.quoteReference) ||
                                selectedAusPostRate?.serviceName === rate.serviceName
                              }
                              onChange={() => setSelectedAusPostRate(rate)}
                              className="text-[#c9a84c] focus:ring-[#c9a84c]"
                            />
                            <span className="text-black">
                              {rate.courierName ? `${formatCourierName(rate.courierName)} · ` : ""}
                              {rate.serviceName} – ${rate.totalPrice.toFixed(2)}
                            </span>
                          </label>
                        ))}
                        {auspostRates.length > visibleTransdirectRates.length && (
                          <p className="text-xs text-sky-900">
                            Showing the most practical options (lowest priced and non-outlier services).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!arrangeFreightDirectly && !useAustraliaPost && (
              <>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="shipping-tier"
                      checked={shippingTier === "standard"}
                      onChange={() => setShippingTier("standard")}
                      className="text-[#c9a84c] focus:ring-[#c9a84c]"
                    />
                    <span className="text-gray-900">
                      Standard – ${standardFee.toFixed(2)}
                      <span className="text-gray-500 text-xs ml-1">(ex GST)</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="shipping-tier"
                      checked={shippingTier === "express"}
                      onChange={() => setShippingTier("express")}
                      className="text-[#c9a84c] focus:ring-[#c9a84c]"
                    />
                    <span className="text-gray-900">
                      Express – ${expressFee.toFixed(2)}
                      <span className="text-gray-500 text-xs ml-1">(ex GST)</span>
                    </span>
                  </label>
                </div>
              </>
            )}
          </section>

          {/* Order summary — total includes shipping (buyer pays) */}
          <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (ex GST):</span>
              <span>${quote.subtotalExGst.toFixed(2)}</span>
            </div>
            {deliveryFeeExGst > 0 && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping (ex GST) — you pay:</span>
                  <span>${deliveryFeeExGst.toFixed(2)}</span>
                </div>
                <p className="text-amber-700 text-xs font-medium">
                  You are responsible for the shipping cost shown above.
                </p>
              </>
            )}
            <div className="flex justify-between text-gray-600">
              <span>{rateLabel}:</span>
              <span>${gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-gray-900 pt-1">
              <span>Total charged (incl. shipping):</span>
              <span>${totalCharged.toFixed(2)}</span>
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Platform fee: 3.5% of product (ex GST), min $1.50 — not on delivery/GST. Fee: $
              {platformFee.toFixed(2)} — deducted from seller. To seller (after fee): ${sellerReceives.toFixed(2)}
            </p>
            <p className="text-gray-600 font-medium mt-2">
              Delivery: {delivery.label}
            </p>
            <p className="text-gray-500 text-xs">{delivery.description}</p>
          </div>

          {/* Terms and Conditions */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900 mb-1">Terms and Conditions</p>
            <p>
              You are authorizing GalaxRX to begin payment processing for the amount of{" "}
              <strong>${totalCharged.toFixed(2)}</strong>, which includes the product total and shipping (paid by you).
            </p>
          </div>

          {checkoutBlocked && cartConfigError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="font-medium">{cartConfigError}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-4 py-2 border border-amber-300 rounded-md text-amber-900 bg-white hover:bg-amber-50"
              >
                Close
              </button>
            </div>
          )}
          {checkoutBlocked && cartQuoteErr && !cartConfigError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="font-medium">{cartQuoteErr}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-4 py-2 border border-amber-300 rounded-md text-amber-900 bg-white hover:bg-amber-50"
              >
                Close
              </button>
            </div>
          )}
          {checkoutBlocked && gstPending && !cartConfigError && !cartQuoteErr && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="font-medium">
                This item cannot be purchased yet because GST classification is pending review.
              </p>
              <p className="text-sm mt-1 text-amber-800">
                The seller or an administrator must set the GST status (taxable or GST-free) before
                checkout is available.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-4 py-2 border border-amber-300 rounded-md text-amber-900 bg-white hover:bg-amber-50"
              >
                Close
              </button>
            </div>
          )}
          {checkoutBlocked &&
            !isCartCheckout &&
            !singleQuoteResult.allowed &&
            !gstPending &&
            !cartConfigError &&
            !awaitingAuspost && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="font-medium">{singleQuoteResult.reason}</p>
                {singleQuoteResult.code === CHECKOUT_BLOCKED_PLATFORM_FEE_CODE && (
                  <p className="text-sm mt-1 text-amber-800">
                    Minimum platform fee applies; raise the order total so the seller is paid after fees.
                  </p>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 px-4 py-2 border border-amber-300 rounded-md text-amber-900 bg-white hover:bg-amber-50"
                >
                  Close
                </button>
              </div>
            )}
          {checkoutBlocked && awaitingAuspost && (
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sky-900 text-sm">
              <p className="font-medium">Select an Australia Post service to continue.</p>
            </div>
          )}
          {!checkoutBlocked && loading && (
            <div className="py-8 text-center text-gray-500">Preparing payment…</div>
          )}
          {!checkoutBlocked && error && !clientSecret && (
            <div className="py-4">
              <p className="text-red-600 text-sm">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          )}
          {!checkoutBlocked && clientSecret && !loading && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: stripeAppearance,
              }}
            >
              <PaymentForm
                listing={primary}
                quantity={
                  isCartCheckout
                    ? rows.reduce((s, r) => s + r.quantity, 0)
                    : rows[0].quantity
                }
                onClose={onClose}
                totalCharged={totalCharged}
                fromCart={isCartCheckout}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BuyNowModal(props: Props) {
  const isCartCheckout = Boolean(props.cartLines && props.cartLines.length > 0);
  if (isCartCheckout) return <BuyNowModalInner {...props} />;
  if (!props.listing || (props.quantity ?? 1) < 1) return null;
  return <BuyNowModalInner {...props} />;
}
