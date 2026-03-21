import Link from "next/link";

export const metadata = {
  title: "Buy wanted stock at hot prices | GalaxRX",
  description: "Post what you need on the Wanted board. Get offers from verified pharmacies at competitive, hot prices.",
};

export default function HotPricePage() {
  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      <header className="border-b border-white/10 bg-[#0D1B2A]/95 sticky top-0 z-10 backdrop-blur-sm">
        <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-heading font-bold">
            <span className="text-white">Galax</span>
            <span className="text-gold">RX</span>
            <span className="text-white"> Market Place</span>
          </Link>
          <Link href="/solutions" className="text-sm text-white/70 hover:text-gold transition-colors">
            ← Back to solutions
          </Link>
        </div>
      </header>
      <main className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-10 pb-20">
        <h1 className="font-heading text-3xl font-bold text-white mb-2">Buy wanted stock at hot prices</h1>
        <p className="text-gold text-sm font-medium mb-8">Post what you need — get competitive offers from verified pharmacies</p>
        <div className="prose prose-invert prose-p:text-white/85 prose-p:leading-relaxed max-w-none">
          <p>
            Need a product that’s in short supply or want to secure surplus and clearance stock at competitive prices? Post your requirement on the GalaxRX Wanted board. Verified pharmacies with that stock can see your request and send you offers — often at hot prices because they’re looking to move surplus or short-dated inventory. You stay in control: compare offers, negotiate, and agree on quantity and terms within the platform. Every participant is a manually verified Australian pharmacy, so you buy with confidence. No platform fee for buyers; join free, post what you need, and get offers at prices that work for you.
          </p>
        </div>
        <Link href="/listings" className="inline-block mt-8 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold font-heading text-sm hover:opacity-90 transition-opacity">
          Browse Wanted board →
        </Link>
      </main>
    </div>
  );
}
