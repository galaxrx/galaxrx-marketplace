import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Listings another pharmacy can still purchase (at least one unreserved unit, still active).
 * Use on marketplace browse, cart preview, pharmacy storefront, etc.
 */
export function listingBuyableByOthersWhere(): Prisma.ListingWhereInput {
  return {
    isActive: true,
    quantityUnits: { gt: prisma.listing.fields.reservedUnits },
  };
}
