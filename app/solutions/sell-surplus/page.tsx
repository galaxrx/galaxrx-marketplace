import Link from "next/link";
import MarketingPageShell from "@/components/landing/MarketingPageShell";

export const metadata = {
  title: "Sell surplus & clearance | GalaxRX",
  description: "List surplus and short-dated pharmacy stock in under 20 seconds. Reach verified buyers only on GalaxRX.",
};

export default function SellSurplusPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-none px-4 py-10 pb-20 sm:px-6 lg:px-8 xl:px-10">
        <p className="mb-6">
          <Link href="/solutions" className="text-sm text-gold/90 transition-colors hover:text-gold">
            ← Solutions
          </Link>
        </p>
        <h1 className="mb-2 font-heading text-3xl font-bold text-white">Sell surplus & clearance</h1>
        <p className="mb-8 text-sm font-medium text-gold">Turn excess stock into cash — list in under 20 seconds</p>
        <div className="prose prose-invert max-w-none prose-p:text-white/85 prose-p:leading-relaxed">
          <p>
            GalaxRX gives your pharmacy a dedicated place to move surplus and short-dated stock without the hassle of lengthy forms or manual data entry. Scan a barcode with your phone and we auto-fill product details; add a photo, set quantity and price, and publish in under 20 seconds. Your listings reach only verified Australian pharmacies — no consumers, no grey market — so you recover value quickly and with confidence. List on the Expiry Clearance board to attract buyers actively looking for discounted short-dated stock, and improve cash flow while reducing waste. Join free, pay only when you sell.
          </p>
        </div>
        <Link
          href="/register"
          className="mt-8 inline-block rounded-xl bg-gradient-to-r from-gold-muted to-gold px-6 py-3 font-heading text-sm font-bold text-[#0D1B2A] transition-opacity hover:opacity-90"
        >
          Start listing →
        </Link>
      </main>
    </MarketingPageShell>
  );
}
