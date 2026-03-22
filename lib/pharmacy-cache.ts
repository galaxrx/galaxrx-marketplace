import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Pharmacy name/logo for dashboard layout.
 * Uses React `cache()` to dedupe within a single request only (safe with `force-dynamic` + Vercel).
 * Avoids `unstable_cache`, which can misbehave with dynamic routes / serverless in some setups.
 */
export const getCachedPharmacyDisplay = cache(async (pharmacyId: string) => {
  return prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { name: true, logoUrl: true },
  });
});
