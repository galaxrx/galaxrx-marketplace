import MarketingPageShell from "@/components/landing/MarketingPageShell";
import AboutMain from "@/components/about/AboutMain";

export const metadata = {
  title: "About GalaxRX | Pharmacy B2B marketplace",
  description:
    "GalaxRX connects licensed Australian pharmacies to trade surplus, clearance, and wanted stock — with verification, secure payments, and no subscription.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <AboutMain />
    </MarketingPageShell>
  );
}
