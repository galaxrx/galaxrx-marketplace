import type { Prisma } from "@prisma/client";

export function negotiationAcceptanceHoldHours(): number {
  const h = Number(process.env.NEGOTIATION_ACCEPTANCE_HOLD_HOURS);
  if (Number.isFinite(h) && h > 0) return h;
  return 24;
}

function holdMs(): number {
  return Math.round(negotiationAcceptanceHoldHours() * 60 * 60 * 1000);
}

/** Cutoff: negotiations accepted before this instant are no longer active holds. */
export function negotiationAcceptanceHoldCutoff(): Date {
  return new Date(Date.now() - holdMs());
}

/**
 * ACCEPTED offers that still reserve the listing for other buyers and unlock the agreed price at checkout.
 * After the hold window, status stays ACCEPTED for audit but is ignored everywhere we use this filter.
 */
export function activeAcceptedListingNegotiationWhere(): Prisma.ListingNegotiationWhereInput {
  return {
    status: "ACCEPTED",
    acceptedAt: { gte: negotiationAcceptanceHoldCutoff() },
  };
}
