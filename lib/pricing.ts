/**
 * Centralized pricing for marketplace.
 * Single source of truth: gross, delivery, GST, platform fee, total, net to seller.
 * All persisted/payment-facing amounts should use this module (and integer cents where stored).
 *
 * LISTING FLOW: Use calculateListingQuote() — it is the single authoritative path for
 * listing quote and checkout. It uses tax classification (GST-free vs taxable).
 * UI quote and create-payment-intent must both use this function.
 */

import { calculatePlatformFee } from "./platform-fee";
import { GST_RATE, TAX_CLASSIFICATION_BLOCKED_MESSAGE } from "./tax";
import { getTaxClassification, calculateGst } from "./tax";
import type { TaxClassification } from "./tax";

export type QuoteInput = {
  unitPriceExGst: number;
  quantity: number;
  deliveryFeeExGst?: number;
};

export type Quote = {
  grossAmount: number;
  deliveryFeeExGst: number;
  subtotalExGst: number;
  gstAmount: number;
  totalCharged: number;
  platformFee: number;
  netToSeller: number;
  // Integer cents for persistence / Stripe
  grossAmountCents: number;
  deliveryFeeExGstCents: number;
  gstAmountCents: number;
  totalChargedCents: number;
  platformFeeCents: number;
  netToSellerCents: number;
};

/** Input for listing quote. isGstFree drives tax classification (true = GST-free, false = taxable, null = REVIEW_REQUIRED = checkout blocked). */
export type ListingQuoteInput = {
  unitPriceExGst: number;
  quantity: number;
  deliveryFeeExGst?: number;
  /** Listing's GST status. null = REVIEW_REQUIRED (checkout blocked until classified). */
  isGstFree?: boolean | null;
};

/** Listing quote: same amounts as Quote plus tax classification for display. */
export type ListingQuote = Quote & {
  taxClassification: TaxClassification;
  rateLabel: string;
};

/** Shown when min platform fee (or %) exceeds what the buyer pays or leaves the seller net negative. */
export const CHECKOUT_BLOCKED_PLATFORM_FEE_CODE = "CHECKOUT_BLOCKED_PLATFORM_FEE" as const;
export const CHECKOUT_BLOCKED_PLATFORM_FEE_MESSAGE =
  "This order total is too low for the marketplace fee (minimum applies). Raise the listed price or add quantity so the seller is paid after fees.";

/** Result of listing quote: either payable (allowed) or blocked due to tax classification. */
export type ListingQuoteResult =
  | { allowed: true; quote: ListingQuote }
  | {
      allowed: false;
      reason: string;
      code: "TAX_CLASSIFICATION_PENDING";
      taxClassification: "REVIEW_REQUIRED";
      quoteForDisplay: ListingQuote;
    }
  | {
      allowed: false;
      reason: string;
      code: typeof CHECKOUT_BLOCKED_PLATFORM_FEE_CODE;
      taxClassification: TaxClassification;
      quoteForDisplay: ListingQuote;
    };

/**
 * Authoritative listing quote calculation. Use this for both UI quote and checkout.
 * TAXABLE => 10% GST; GST_FREE => 0%; REVIEW_REQUIRED => checkout blocked (no payable quote).
 * Same logic is used by create-payment-intent so UI and payment never diverge.
 */
export function calculateListingQuote(input: ListingQuoteInput): ListingQuote {
  const { unitPriceExGst, quantity, deliveryFeeExGst = 0, isGstFree = null } = input;
  const grossAmount = unitPriceExGst * quantity;
  // Fee base = product ex GST only (see lib/platform-fee.ts). Not buyer total, not GST, not delivery.
  const platformFee = calculatePlatformFee(grossAmount);
  const subtotalExGst = grossAmount + deliveryFeeExGst;
  const taxResult = getTaxClassification({ isGstFreeOverride: isGstFree ?? undefined });
  const gstAmount = calculateGst(subtotalExGst, taxResult);
  const totalCharged = subtotalExGst + gstAmount;
  const netToSeller = grossAmount - platformFee + deliveryFeeExGst;

  return {
    grossAmount,
    deliveryFeeExGst,
    subtotalExGst,
    gstAmount,
    totalCharged,
    platformFee,
    netToSeller,
    grossAmountCents: Math.round(grossAmount * 100),
    deliveryFeeExGstCents: Math.round(deliveryFeeExGst * 100),
    gstAmountCents: Math.round(gstAmount * 100),
    totalChargedCents: Math.round(totalCharged * 100),
    platformFeeCents: Math.round(platformFee * 100),
    netToSellerCents: Math.round(netToSeller * 100),
    taxClassification: taxResult.classification,
    rateLabel: taxResult.rateLabel,
  };
}

/**
 * Get listing quote with checkout-allowed flag. Use this for UI and payment decisions.
 * When tax classification is REVIEW_REQUIRED, returns allowed: false — do not create PaymentIntent.
 */
export function getListingQuoteResult(input: ListingQuoteInput): ListingQuoteResult {
  const quoteForDisplay = calculateListingQuote(input);
  if (quoteForDisplay.taxClassification === "REVIEW_REQUIRED") {
    return {
      allowed: false,
      reason: TAX_CLASSIFICATION_BLOCKED_MESSAGE,
      code: "TAX_CLASSIFICATION_PENDING",
      taxClassification: "REVIEW_REQUIRED",
      quoteForDisplay,
    };
  }
  if (
    quoteForDisplay.platformFeeCents > quoteForDisplay.totalChargedCents ||
    quoteForDisplay.netToSellerCents < 0
  ) {
    return {
      allowed: false,
      reason: CHECKOUT_BLOCKED_PLATFORM_FEE_MESSAGE,
      code: CHECKOUT_BLOCKED_PLATFORM_FEE_CODE,
      taxClassification: quoteForDisplay.taxClassification,
      quoteForDisplay,
    };
  }
  return { allowed: true, quote: quoteForDisplay };
}

/**
 * Legacy quote: always applies 10% GST. Do NOT use for payment or checkout.
 * Prefer getListingQuoteResult/calculateListingQuote for listing flow. This exists only for
 * non-payment contexts (e.g. display estimates where classification is not yet available).
 */
export function calculateQuote(input: QuoteInput): Quote {
  const { unitPriceExGst, quantity, deliveryFeeExGst = 0 } = input;
  const grossAmount = unitPriceExGst * quantity;
  const platformFee = calculatePlatformFee(grossAmount);
  const subtotalExGst = grossAmount + deliveryFeeExGst;
  const gstAmount = subtotalExGst * GST_RATE;
  const totalCharged = subtotalExGst + gstAmount;
  const netToSeller = grossAmount - platformFee + deliveryFeeExGst;

  return {
    grossAmount,
    deliveryFeeExGst,
    subtotalExGst,
    gstAmount,
    totalCharged,
    platformFee,
    netToSeller,
    grossAmountCents: Math.round(grossAmount * 100),
    deliveryFeeExGstCents: Math.round(deliveryFeeExGst * 100),
    gstAmountCents: Math.round(gstAmount * 100),
    totalChargedCents: Math.round(totalCharged * 100),
    platformFeeCents: Math.round(platformFee * 100),
    netToSellerCents: Math.round(netToSeller * 100),
  };
}
