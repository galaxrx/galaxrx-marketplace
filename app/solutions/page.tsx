import Link from "next/link";
import SolutionsMain from "@/components/solutions/SolutionsMain";

export const metadata = {
  title: "Solutions | GalaxRX pharmacy marketplace",
  description:
    "Use cases and platform features for Australian pharmacies: surplus, clearance, Wanted board, fast listing, offers, and price guidance — verified network, Stripe-secured.",
};

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      <header className="border-b border-white/10 bg-[#0D1B2A]/95 sticky top-0 z-10 backdrop-blur-md">
        <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="text-lg sm:text-xl font-heading font-bold shrink-0">
            <span className="text-white">Galax</span>
            <span className="text-gold">RX</span>
            <span className="text-white hidden sm:inline"> Market Place</span>
          </Link>
          <Link href="/" className="text-sm text-white/70 hover:text-gold transition-colors whitespace-nowrap">
            ← Home
          </Link>
        </div>
      </header>

      <SolutionsMain />
    </div>
  );
}
