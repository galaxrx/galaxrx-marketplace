import Link from "next/link";
import MarketingPageShell from "@/components/landing/MarketingPageShell";

export const metadata = {
  title: "Find hard-to-source stock | GalaxRX",
  description: "Browse surplus and clearance listings or post on the Wanted board. Get offers from verified pharmacies.",
};

export default function FindStockPage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-none px-4 py-10 pb-20 sm:px-6 lg:px-8 xl:px-10">
        <p className="mb-6">
          <Link href="/solutions" className="text-sm text-gold/90 transition-colors hover:text-gold">
            ← Solutions
          </Link>
        </p>
        <h1 className="mb-2 font-heading text-3xl font-bold text-white">Find hard-to-source stock</h1>
        <p className="mb-8 text-sm font-medium text-gold">Browse listings or post what you need — verified pharmacies only</p>
        <div className="prose prose-invert max-w-none prose-p:text-white/85 prose-p:leading-relaxed">
          <p>
            When you need stock that’s in short supply or hard to source through usual channels, GalaxRX connects you with other verified Australian pharmacies. Search the marketplace for surplus and clearance listings, or post on the Wanted board to describe what you need — qualified sellers can then make you offers directly. Every participant is manually verified, so you deal only with licensed pharmacies. Find the stock you need without chasing multiple suppliers, and negotiate quantity, price, and terms in one place. Buyers pay no platform fee; join free and start browsing or posting today.
          </p>
        </div>
        <Link
          href="/listings"
          className="mt-8 inline-block rounded-xl bg-gradient-to-r from-gold-muted to-gold px-6 py-3 font-heading text-sm font-bold text-[#0D1B2A] transition-opacity hover:opacity-90"
        >
          Browse listings →
        </Link>
      </main>
    </MarketingPageShell>
  );
}
