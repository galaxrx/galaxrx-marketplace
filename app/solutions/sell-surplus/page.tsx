import Link from "next/link";

export const metadata = {
  title: "Sell surplus & clearance | GalaxRX",
  description: "List surplus and short-dated pharmacy stock in under 20 seconds. Reach verified buyers only on GalaxRX.",
};

export default function SellSurplusPage() {
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
        <h1 className="font-heading text-3xl font-bold text-white mb-2">Sell surplus & clearance</h1>
        <p className="text-gold text-sm font-medium mb-8">Turn excess stock into cash — list in under 20 seconds</p>
        <div className="prose prose-invert prose-p:text-white/85 prose-p:leading-relaxed max-w-none">
          <p>
            GalaxRX gives your pharmacy a dedicated place to move surplus and short-dated stock without the hassle of lengthy forms or manual data entry. Scan a barcode with your phone and we auto-fill product details; add a photo, set quantity and price, and publish in under 20 seconds. Your listings reach only verified Australian pharmacies — no consumers, no grey market — so you recover value quickly and with confidence. List on the Expiry Clearance board to attract buyers actively looking for discounted short-dated stock, and improve cash flow while reducing waste. Join free, pay only when you sell.
          </p>
        </div>
        <Link href="/register" className="inline-block mt-8 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold font-heading text-sm hover:opacity-90 transition-opacity">
          Start listing →
        </Link>
      </main>
    </div>
  );
}
