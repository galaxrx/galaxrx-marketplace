import Link from "next/link";
import MarketingPageShell from "@/components/landing/MarketingPageShell";

export const metadata = {
  title: "Buy wanted stock at hot prices | GalaxRX",
  description: "Post what you need on the Wanted board. Get offers from verified pharmacies at competitive, hot prices.",
};

export default function HotPricePage() {
  return (
    <MarketingPageShell>
      <main className="mx-auto w-full max-w-none px-4 py-10 pb-20 sm:px-6 lg:px-8 xl:px-10">
        <p className="mb-6">
          <Link href="/solutions" className="text-sm text-gold/90 transition-colors hover:text-gold">
            ← Solutions
          </Link>
        </p>
        <h1 className="mb-2 font-heading text-3xl font-bold text-white">Buy wanted stock at hot prices</h1>
        <p className="mb-8 text-sm font-medium text-gold">Post what you need — get competitive offers from verified pharmacies</p>
        <div className="prose prose-invert max-w-none prose-p:text-white/85 prose-p:leading-relaxed">
          <p>
            Need a product that’s in short supply or want to secure surplus and clearance stock at competitive prices? Post your requirement on the GalaxRX Wanted board. Verified pharmacies with that stock can see your request and send you offers — often at hot prices because they’re looking to move surplus or short-dated inventory. You stay in control: compare offers, negotiate, and agree on quantity and terms within the platform. Every participant is a manually verified Australian pharmacy, so you buy with confidence. No platform fee for buyers; join free, post what you need, and get offers at prices that work for you.
          </p>
        </div>
        <Link
          href="/listings"
          className="mt-8 inline-block rounded-xl bg-gradient-to-r from-gold-muted to-gold px-6 py-3 font-heading text-sm font-bold text-[#0D1B2A] transition-opacity hover:opacity-90"
        >
          Browse Wanted board →
        </Link>
      </main>
    </MarketingPageShell>
  );
}
