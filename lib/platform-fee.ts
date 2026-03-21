/**
 * Platform fee calculation. Shared by Stripe (server) and pricing (client-safe).
 * Single source for fee constants so listing quote and checkout stay in sync.
 *
 * FEE BASE (non-negotiable for accounting):
 * - `grossAmount` MUST be the product line total **excluding GST** (unit price ex GST × qty).
 * - Delivery (ex GST) is NOT included in this base.
 * - GST collected from the buyer is NOT included in this base — the marketplace does not
 *   take GST as platform fee; Stripe `application_fee_amount` is only the value returned here.
 *
 * Examples (taxable, for intuition only):
 * - Product $80 ex GST → fee = max(3.5% × 80, $1.50) = **$2.80** — NOT 3.5% of $88 (inc GST product),
 *   NOT 3.5% of $110 (full buyer total with delivery + GST).
 */

export const PLATFORM_FEE_PERCENT = 0.035; // 3.5%
export const MIN_PLATFORM_FEE = 1.5; // minimum $1.50 per sale

/** Platform fee: 3.5% of product total ex GST, minimum $1.50 (delivery and GST excluded). */
export function calculatePlatformFee(grossAmount: number): number {
  const percentFee = grossAmount * PLATFORM_FEE_PERCENT;
  return Math.max(percentFee, MIN_PLATFORM_FEE);
}
