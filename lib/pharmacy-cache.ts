import { cache } from "react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

async function fetchPharmacyDisplayRow(pharmacyId: string) {
  return prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { name: true, logoUrl: true },
  });
}

/**
 * Pharmacy name/logo for dashboard header.
 * - React `cache()`: dedupe within one request.
 * - `unstable_cache`: reuse across navigations for ~90s so tab switches skip repeated DB round-trips.
 *   (Name/logo can lag briefly after a settings change; acceptable for nav chrome.)
 */
export const getCachedPharmacyDisplay = cache(async (pharmacyId: string) => {
  return unstable_cache(
    () => fetchPharmacyDisplayRow(pharmacyId),
    ["dashboard-pharmacy-display", pharmacyId],
    { revalidate: 90 }
  )();
});
