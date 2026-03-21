"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getTaxClassification, calculateGst, TAX_CLASSIFICATION_PENDING_CODE, TAX_CLASSIFICATION_BLOCKED_MESSAGE } from "@/lib/tax";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type Offer = {
  id: string;
  quantity: number;
  pricePerPack: number;
  pricePerUnit?: number | null;
  wantedItem: { productName: string; strength: string | null };
  seller: { id: string; name: string; isVerified: boolean; state: string };
};

function PaymentForm({
  offer,
  totalCharged,
}: {
  offer: Offer;
  totalCharged: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
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
          return_url: `${window.location.origin}/orders?success=true`,
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
      <p className="text-sm text-white/70">
        Pay at the agreed price. Select your payment method below.
      </p>
      <div className="border-t border-[rgba(161,130,65,0.2)] pt-4 mt-4">
        <PaymentElement />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2 justify-end pt-2">
        <Link
          href="/wanted"
          className="px-4 py-2 border border-[rgba(161,130,65,0.4)] text-white/80 rounded-lg hover:bg-white/5"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!stripe || !elements || loading}
          className="px-4 py-2 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] rounded-lg font-bold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Processing…" : `Pay $${totalCharged.toFixed(2)}`}
        </button>
      </div>
    </form>
  );
}

export default function PayAcceptedOfferClient({ offer }: { offer: Offer }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const grossAmount =
    offer.pricePerUnit != null && offer.pricePerUnit > 0
      ? offer.pricePerUnit * offer.quantity
      : offer.pricePerPack * offer.quantity;
  const deliveryFeeExGST = 0;
  const subtotalExGST = grossAmount + deliveryFeeExGST;
  const taxResult = getTaxClassification({ isGstFreeOverride: undefined });
  const gstAmount = calculateGst(subtotalExGST, taxResult);
  const totalCharged = subtotalExGST + gstAmount;
  const checkoutBlocked = taxResult.checkoutBlocked;

  useEffect(() => {
    if (checkoutBlocked) {
      setLoading(false);
      setClientSecret(null);
      setError(TAX_CLASSIFICATION_BLOCKED_MESSAGE);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setClientSecret(null);
      try {
        const idempotencyKey = `pi-wanted-${offer.id}-${deliveryFeeExGST}`;
        const res = await fetch("/api/stripe/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wantedOfferId: offer.id,
            deliveryFee: deliveryFeeExGST,
            idempotencyKey,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const isTaxBlocked = res.status === 403 && data.code === TAX_CLASSIFICATION_PENDING_CODE;
          setError(isTaxBlocked ? TAX_CLASSIFICATION_BLOCKED_MESSAGE : (data.message ?? "Failed to start payment"));
          setLoading(false);
          return;
        }
        if (!cancelled && data.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      } catch {
        if (!cancelled) setError("Something went wrong");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [offer.id, checkoutBlocked]);

  return (
    <div className="p-4 md:p-6 w-full max-w-none">
      <h1 className="text-2xl font-heading font-bold text-gold mb-2">Proceed at agreed price</h1>
      <p className="text-white/70 text-sm mb-6">
        You accepted an offer from {offer.seller.name}
        {offer.seller.isVerified && " ✓"} · {offer.seller.state}. Complete payment below.
      </p>

      <div className="bg-mid-navy border border-[rgba(161,130,65,0.25)] rounded-xl p-4 mb-6">
        <p className="font-medium text-white">
          {offer.wantedItem.productName}
          {offer.wantedItem.strength && ` · ${offer.wantedItem.strength}`}
        </p>
        <p className="text-white/70 text-sm mt-1">
          {offer.pricePerUnit != null && offer.pricePerUnit > 0
            ? `${offer.quantity} unit(s) × $${offer.pricePerUnit.toFixed(2)}/unit = $${grossAmount.toFixed(2)} (ex GST)`
            : `${offer.quantity} pack(s) × $${offer.pricePerPack.toFixed(2)}/pack = $${grossAmount.toFixed(2)} (ex GST)`}
        </p>
        <p className="text-white/70 text-sm mt-1">
          {taxResult.rateLabel}: ${gstAmount.toFixed(2)}
        </p>
        <p className="font-semibold text-gold mt-2">
          Total: ${totalCharged.toFixed(2)}
        </p>
      </div>

      {loading && (
        <div className="py-8 text-center text-white/60">Preparing payment…</div>
      )}
      {error && !clientSecret && (
        <div className="py-4">
          <p className="text-red-400 text-sm">{error}</p>
          <Link
            href="/wanted"
            className="mt-3 inline-block text-gold font-medium hover:underline"
          >
            ← Back to Wanted items
          </Link>
        </div>
      )}
      {clientSecret && !loading && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: "night", variables: { colorPrimary: "#c9a84c" } },
          }}
        >
          <PaymentForm offer={offer} totalCharged={totalCharged} />
        </Elements>
      )}
    </div>
  );
}
