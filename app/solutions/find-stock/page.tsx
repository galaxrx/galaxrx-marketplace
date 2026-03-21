import Link from "next/link";

export const metadata = {
  title: "Find hard-to-source stock | GalaxRX",
  description: "Browse surplus and clearance listings or post on the Wanted board. Get offers from verified pharmacies.",
};

export default function FindStockPage() {
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
        <h1 className="font-heading text-3xl font-bold text-white mb-2">Find hard-to-source stock</h1>
        <p className="text-gold text-sm font-medium mb-8">Browse listings or post what you need — verified pharmacies only</p>
        <div className="prose prose-invert prose-p:text-white/85 prose-p:leading-relaxed max-w-none">
          <p>
            When you need stock that’s in short supply or hard to source through usual channels, GalaxRX connects you with other verified Australian pharmacies. Search the marketplace for surplus and clearance listings, or post on the Wanted board to describe what you need — qualified sellers can then make you offers directly. Every participant is manually verified, so you deal only with licensed pharmacies. Find the stock you need without chasing multiple suppliers, and negotiate quantity, price, and terms in one place. Buyers pay no platform fee; join free and start browsing or posting today.
          </p>
        </div>
        <Link href="/listings" className="inline-block mt-8 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold font-heading text-sm hover:opacity-90 transition-opacity">
          Browse listings →
        </Link>
      </main>
    </div>
  );
}
