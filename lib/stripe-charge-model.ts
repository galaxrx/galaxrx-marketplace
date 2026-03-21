/**
 * GalaxRX Connect Charge Model Configuration
 *
 * DESTINATION CHARGES (supported):
 *   - PaymentIntent created on platform (GalaxRX) Stripe account
 *   - Funds transferred to seller via transfer_data.destination
 *   - GalaxRX is merchant of record; chargebacks/refunds are platform liability
 *   - application_fee_amount retained by platform from the transfer
 *
 * DIRECT CHARGES (disabled):
 *   - Real direct charges require creating the PaymentIntent in CONNECTED ACCOUNT
 *     context (Stripe-Account: acct_xxx), not platform context.
 *   - Current code previously faked "direct" by creating the PI on the platform
 *     with on_behalf_of + transfer_data.destination — that is destination semantics,
 *     not direct. Direct mode is disabled until we have:
 *     - PI creation with stripeAccount (connected account)
 *     - No transfer_data in the direct path
 *     - Webhook handling for Connect/connected-account events
 *     - Refund and reconciliation using connected-account context
 *
 * @see https://stripe.com/docs/connect/direct-charges
 * @see https://stripe.com/docs/connect/destination-charges
 */

export type ChargeModel = "destination" | "direct";

/** Thrown when STRIPE_USE_DIRECT_CHARGES=true; direct mode is not yet implemented. */
export class DirectChargeNotSupportedError extends Error {
  constructor() {
    super(
      "Direct charge mode is not supported. Set STRIPE_USE_DIRECT_CHARGES to false or unset it. " +
        "Only destination charges are supported until PI creation, webhooks, and refunds use connected-account context."
    );
    this.name = "DirectChargeNotSupportedError";
  }
}

/**
 * Returns the active charge model. Use this when creating PaymentIntents.
 * Throws DirectChargeNotSupportedError if STRIPE_USE_DIRECT_CHARGES=true,
 * so that no code path can create a fake "direct" charge on the platform.
 */
export function getChargeModel(): ChargeModel {
  if (process.env.STRIPE_USE_DIRECT_CHARGES === "true") {
    throw new DirectChargeNotSupportedError();
  }
  return "destination";
}
