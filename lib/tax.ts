/**
 * GalaxRX Tax Classification Module
 *
 * Australian GST rules for pharmacy/FMCG items are complex:
 * - Most OTC medicines sold at retail: GST-free under GSTA 1999 Div 38-B
 * - Vitamins, supplements, cosmetics, personal care: TAXABLE at 10%
 * - Prescription-only medicines: GST-free
 * - Medical devices: classification depends on item
 *
 * IMPORTANT: This classification has NOT been reviewed by a tax professional.
 * All items are currently marked REVIEW_REQUIRED as a safe default.
 * A qualified tax adviser must classify each product category before
 * TAXABLE or GST_FREE is used in production invoicing.
 *
 * @see https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/rules-for-specific-industries/health/gst-and-health
 */

export type TaxClassification = "TAXABLE" | "GST_FREE" | "REVIEW_REQUIRED";

export const GST_RATE = 0.1;

/** Stable machine-readable code when checkout is blocked due to unknown tax classification. */
export const TAX_CLASSIFICATION_PENDING_CODE = "TAX_CLASSIFICATION_PENDING" as const;

export const TAX_CLASSIFICATION_BLOCKED_MESSAGE =
  "This item cannot be purchased yet because GST classification is pending review." as const;

export interface TaxResult {
  classification: TaxClassification;
  rate: number; // 0 or 0.1
  rateLabel: string; // e.g. "GST (10%)" or "GST-Free" or "GST (Pending Review)"
  reviewRequired: boolean;
  /** When true, checkout must not proceed; no PaymentIntent should be created. */
  checkoutBlocked: boolean;
}

/**
 * Get tax classification for a listing.
 * Currently returns REVIEW_REQUIRED for all items as a safe default.
 * Update this function when product categories are defined and reviewed.
 */
export function getTaxClassification(params: {
  productCategory?: string | null;
  isGstFreeOverride?: boolean | null;
}): TaxResult {
  if (params.isGstFreeOverride === true) {
    return {
      classification: "GST_FREE",
      rate: 0,
      rateLabel: "GST-Free",
      reviewRequired: false,
      checkoutBlocked: false,
    };
  }
  if (params.isGstFreeOverride === false) {
    return {
      classification: "TAXABLE",
      rate: GST_RATE,
      rateLabel: "GST (10%)",
      reviewRequired: false,
      checkoutBlocked: false,
    };
  }
  // Unknown classification: BLOCK checkout. Do not treat as 0% — that would undercharge GST for taxable items.
  return {
    classification: "REVIEW_REQUIRED",
    rate: 0,
    rateLabel: "GST (pending review)",
    reviewRequired: true,
    checkoutBlocked: true,
  };
}

/**
 * Calculate GST amount given a subtotal and classification.
 */
export function calculateGst(subtotalExGst: number, taxResult: TaxResult): number {
  return subtotalExGst * taxResult.rate;
}
