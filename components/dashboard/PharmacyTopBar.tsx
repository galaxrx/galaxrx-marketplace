import TopBar from "@/components/dashboard/TopBar";
import ClientOnly from "@/components/ClientOnly";

const headerFallback = (
  <header className="app-header sticky top-0 z-40 h-20 border-b flex items-center justify-end gap-4 px-4" />
);

type Props = {
  pharmacyName: string;
  pharmacyLogoUrl: string | null;
};

export default function PharmacyTopBar({ pharmacyName, pharmacyLogoUrl }: Props) {
  return (
    <ClientOnly fallback={headerFallback}>
      <TopBar pharmacyName={pharmacyName} pharmacyLogoUrl={pharmacyLogoUrl} />
    </ClientOnly>
  );
}
