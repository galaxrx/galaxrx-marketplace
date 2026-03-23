import Link from "next/link";
import MarketingPageShell from "@/components/landing/MarketingPageShell";

export const metadata = {
  title: "Expiry clearance board | GalaxRX",
  description: "Give short-dated stock visibility. Buyers searching for clearance find you — recover value before it expires.",
};

export default function ExpiryClearancePage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-none px-4 py-10 pb-20 sm:px-6 lg:px-8 xl:px-10">
        <p className="mb-6">
          <Link href="/solutions" className="text-sm text-gold/90 transition-colors hover:text-gold">
            ← Solutions
          </Link>
        </p>
        <h1 className="mb-2 font-heading text-3xl font-bold text-white">Expiry clearance board</h1>
        <p className="mb-8 text-sm font-medium text-gold">Short-dated stock gets seen — recover value before it expires</p>
        <div className="prose prose-invert max-w-none prose-p:text-white/85 prose-p:leading-relaxed">
          <p>
            Short-dated and near-expiry stock doesn’t have to become a write-off. On GalaxRX, when you list with an expiry date, your item is automatically surfaced on the Expiry Clearance board. Buyers who are actively looking for discounted clearance stock can find you there, so you turn inventory that might otherwise be written off into recovered value. The board is built for speed: list in under 20 seconds with a barcode scan, set your price, and reach verified pharmacies only. No subscription, no listing fees — you pay only 3.5% when you sell. Give short-dated stock the visibility it needs and clear it before it expires.
          </p>
        </div>
        <Link
          href="/register"
          className="mt-8 inline-block rounded-xl bg-gradient-to-r from-gold-muted to-gold px-6 py-3 font-heading text-sm font-bold text-[#0D1B2A] transition-opacity hover:opacity-90"
        >
          List on clearance board →
        </Link>
      </main>
    </MarketingPageShell>
  );
}
