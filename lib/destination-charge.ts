/**
 * Destination-charge amount semantics for GalaxRX Connect.
 *
 * CHARGE MODEL: Destination only. PaymentIntent is created on the platform account;
 * transfer_data.destination sends funds to the seller; application_fee_amount
 * is retained by the platform.
 *
 * APPLICATION_FEE SEMANTICS (explicit, single source of truth):
 * - application_fee_amount = platform fee only (NOT GST). Fee is computed from product ex GST
 *   per lib/platform-fee.ts — not from buyer inc-GST total.
 * - Platform retains: platform fee.
 * - Transfer to seller = buyerTotalCents - applicationFeeAmountCents
 *   = totalCharged - platformFee = netToSellerCents + gstAmountCents.
 * - So in this model the seller receives commercial net + GST; GST ownership/
 *   remittance is a separate tax/legal concern and is not encoded in Stripe's
 *   application_fee in this codebase.
 *
 * Use this module for all destination PaymentIntent creation. Do not compute
 * application_fee_amount inline in routes.
 */

export type DestinationChargeInput = {
  totalChargedCents: number;
  platformFeeCents: number;
  gstAmountCents: number;
  netToSellerCents: number;
};

export type DestinationChargeAmounts = {
  /** Total charged to buyer (Stripe PaymentIntent amount). */
  buyerTotalCents: number;
  /** Platform fee retained by GalaxRX. */
  platformFeeCents: number;
  /** GST amount (for display/audit; not included in application_fee_amount). */
  gstAmountCents: number;
  /** Stripe application_fee_amount: platform fee only. */
  applicationFeeAmountCents: number;
  /** Commercial net to seller (gross - platform fee + delivery). */
  netToSellerCents: number;
  /** Actual Stripe transfer to seller = buyerTotalCents - applicationFeeAmountCents. */
  transferToSellerCents: number;
  chargeModel: "destination";
};

/**
 * Single authoritative destination-charge calculation.
 * Returns amounts to use when creating a destination PaymentIntent.
 * application_fee_amount is platform fee only; GST is not bundled into it.
 */
export function calculateDestinationChargeAmounts(
  input: DestinationChargeInput
): DestinationChargeAmounts {
  const {
    totalChargedCents,
    platformFeeCents,
    gstAmountCents,
    netToSellerCents,
  } = input;

  const applicationFeeAmountCents = platformFeeCents;
  const transferToSellerCents = totalChargedCents - applicationFeeAmountCents;

  return {
    buyerTotalCents: totalChargedCents,
    platformFeeCents,
    gstAmountCents,
    applicationFeeAmountCents,
    netToSellerCents,
    transferToSellerCents,
    chargeModel: "destination",
  };
}
