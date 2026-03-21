import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * Cached pharmacy name/logo for dashboard layout. Reduces repeated DB hits on navigation.
 * Revalidate every 60s so profile/logo updates appear within a minute.
 */
export async function getCachedPharmacyDisplay(pharmacyId: string) {
  return unstable_cache(
    async () => {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: pharmacyId },
        select: { name: true, logoUrl: true },
      });
      return pharmacy;
    },
    ["pharmacy-display", pharmacyId],
    { revalidate: 60, tags: [`pharmacy-${pharmacyId}`] }
  )();
}
