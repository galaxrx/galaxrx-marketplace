type ListingPendingCandidate = {
  id: string;
  quantityUnits: number;
  reservedUnits: number;
};

/**
 * "Pending" means a listing is fully held by an active checkout that uses an accepted negotiation.
 * This avoids marking a listing pending for partial-quantity accepted offers.
 */
export async function getPendingListingIdSet(
  listings: ListingPendingCandidate[]
): Promise<Set<string>> {
  const fullyReservedIds = listings
    .filter((l) => l.quantityUnits > 0 && l.reservedUnits >= l.quantityUnits)
    .map((l) => l.id);
  return new Set(fullyReservedIds);
}
