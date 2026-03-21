"use client";

/**
 * Seller-facing notice: card settlements and Stripe payouts are not instant.
 * Shown wherever sellers learn about receiving money (settings, account).
 */
export default function SellerPayoutTimingNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-100/95 ${className}`}
      role="note"
    >
      <p className="font-semibold text-amber-200">When you get paid</p>
      <p className="mt-2 text-white/80 leading-relaxed">
        Card payments are <strong className="text-white">not instant</strong> to your bank. Stripe first holds funds for a{" "}
        <strong className="text-white">pending period</strong> (often a few business days) while the payment settles, then
        moves them to your <strong className="text-white">available</strong> balance. Money reaches your bank after Stripe
        runs a <strong className="text-white">payout</strong> on your payout schedule (automatic or manual). Exact dates
        appear in your{" "}
        <a
          href="https://dashboard.stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline hover:opacity-90"
        >
          Stripe dashboard
        </a>
        .
      </p>
    </div>
  );
}
