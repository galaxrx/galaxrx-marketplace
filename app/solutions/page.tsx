import MarketingPageShell from "@/components/landing/MarketingPageShell";
import SolutionsMain from "@/components/solutions/SolutionsMain";

export const metadata = {
  title: "Solutions | GalaxRX pharmacy marketplace",
  description:
    "Use cases and platform features for Australian pharmacies: surplus, clearance, Wanted board, fast listing, offers, and price guidance — verified network, Stripe-secured.",
};

export default function SolutionsPage() {
  return (
    <MarketingPageShell>
      <SolutionsMain />
    </MarketingPageShell>
  );
}
