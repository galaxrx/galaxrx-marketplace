import { getCachedPharmacyDisplay } from "@/lib/pharmacy-cache";
import PharmacyTopBar from "@/components/dashboard/PharmacyTopBar";

export default async function PharmacyTopBarAsync({ pharmacyId }: { pharmacyId: string }) {
  let pharmacy: Awaited<ReturnType<typeof getCachedPharmacyDisplay>> = null;
  try {
    pharmacy = await getCachedPharmacyDisplay(pharmacyId);
  } catch (e) {
    console.error("[PharmacyTopBarAsync] pharmacy lookup failed", e);
  }
  return (
    <PharmacyTopBar
      pharmacyName={pharmacy?.name ?? "Pharmacy"}
      pharmacyLogoUrl={pharmacy?.logoUrl ?? null}
    />
  );
}
