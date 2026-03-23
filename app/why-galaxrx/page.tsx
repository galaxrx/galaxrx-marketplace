import MarketingPageShell from "@/components/landing/MarketingPageShell";
import WhyGalaxRxMain from "@/components/why-galaxrx/WhyGalaxRxMain";

export const metadata = {
  title: "Why GalaxRX | Verified pharmacy marketplace",
  description:
    "Verified pharmacies, price guidance, offers in one thread, and secure settlement — B2B surplus and clearance without the noise.",
};

export default function WhyGalaxRxPage() {
  return (
    <MarketingPageShell>
      <WhyGalaxRxMain />
    </MarketingPageShell>
  );
}
