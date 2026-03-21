import Link from "next/link";
import SellerPayoutTimingNotice from "@/components/account/SellerPayoutTimingNotice";

type EFT = {
  bankName: string;
  bsb: string;
  accountNumber: string;
  accountName: string;
};

type Props = {
  memberId: string;
  hasStripeConnected: boolean;
  platformName: string;
  eft: EFT;
};

export default function AccountPaymentMethods({
  memberId,
  hasStripeConnected,
  platformName,
  eft,
}: Props) {
  return (
    <section className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6 space-y-8">
      <h2 className="font-heading font-semibold text-lg text-white">Payment methods</h2>

      {/* Pay by card (Stripe) */}
      <div className="border border-white/10 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">Pay by credit card</span>
          <span className="text-xs text-white/50">Visa, Mastercard, Amex</span>
        </div>
        <p className="text-sm text-white/70">
          Card payments are processed securely via Stripe. You don’t need a Stripe account — just use the pay button when checking out or settling an invoice.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/buy"
            className="inline-flex items-center gap-2 bg-gold text-[#0D1B2A] px-4 py-2.5 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Shop & pay with card
          </Link>
          {hasStripeConnected ? (
            <span className="text-success text-sm self-center">Stripe connected for receiving payouts</span>
          ) : (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 border border-gold/50 text-gold px-4 py-2.5 rounded-lg font-medium hover:bg-gold/10 transition"
            >
              Connect Stripe to receive payouts
            </Link>
          )}
        </div>
        {hasStripeConnected ? (
          <SellerPayoutTimingNotice className="mt-4" />
        ) : null}
      </div>

      {/* Pay by EFT / Direct deposit */}
      <div className="border border-white/10 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">Pay by EFT / direct deposit</span>
        </div>
        <p className="text-sm text-white/70">
          Transfer funds directly to {platformName}. Use this for invoice payments or account top-ups.
        </p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm bg-white/5 rounded-lg p-4">
          <div>
            <dt className="text-white/50">Recipient</dt>
            <dd className="font-medium text-white">{eft.accountName}</dd>
          </div>
          <div>
            <dt className="text-white/50">Bank</dt>
            <dd className="font-medium text-white">{eft.bankName}</dd>
          </div>
          <div>
            <dt className="text-white/50">BSB</dt>
            <dd className="font-medium text-white font-mono">{eft.bsb}</dd>
          </div>
          <div>
            <dt className="text-white/50">Account number</dt>
            <dd className="font-medium text-white font-mono">{eft.accountNumber}</dd>
          </div>
        </dl>
        <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-200">
            Always include your Member ID as the payment reference so we can match your payment.
          </p>
          <p className="mt-2 text-lg font-bold text-gold font-mono">{memberId}</p>
          <p className="text-xs text-white/60 mt-1">Add this in the “Reference” or “Description” field when making the transfer.</p>
        </div>
      </div>
    </section>
  );
}
