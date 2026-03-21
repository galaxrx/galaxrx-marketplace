import Link from "next/link";

export const metadata = {
  title: "Expiry clearance board | GalaxRX",
  description: "Give short-dated stock visibility. Buyers searching for clearance find you — recover value before it expires.",
};

export default function ExpiryClearancePage() {
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
        <h1 className="font-heading text-3xl font-bold text-white mb-2">Expiry clearance board</h1>
        <p className="text-gold text-sm font-medium mb-8">Short-dated stock gets seen — recover value before it expires</p>
        <div className="prose prose-invert prose-p:text-white/85 prose-p:leading-relaxed max-w-none">
          <p>
            Short-dated and near-expiry stock doesn’t have to become a write-off. On GalaxRX, when you list with an expiry date, your item is automatically surfaced on the Expiry Clearance board. Buyers who are actively looking for discounted clearance stock can find you there, so you turn inventory that might otherwise be written off into recovered value. The board is built for speed: list in under 20 seconds with a barcode scan, set your price, and reach verified pharmacies only. No subscription, no listing fees — you pay only 3.5% when you sell. Give short-dated stock the visibility it needs and clear it before it expires.
          </p>
        </div>
        <Link href="/register" className="inline-block mt-8 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold font-heading text-sm hover:opacity-90 transition-opacity">
          List on clearance board →
        </Link>
      </main>
    </div>
  );
}
