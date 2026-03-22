import type Stripe from "stripe";

/** Shown to buyers when the seller's stored Connect account ID is wrong for current Stripe mode (test vs live). */
export const SELLER_STRIPE_ACCOUNT_INVALID_MESSAGE =
  "The seller's bank payout account is not valid for the current payment setup (this often happens after switching Stripe from test to live). Ask the seller to open Settings → Bank account (Stripe) → \"Reconnect for live payments\", complete Stripe onboarding again, then retry checkout.";

/**
 * True when Stripe indicates the Connect account ID does not exist for this API key / mode.
 */
export function isStripeConnectAccountNotFoundError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as Partial<Stripe.errors.StripeError> & { raw?: { message?: string } };
  const msg = (typeof err.message === "string" ? err.message : "") || (err.raw?.message ?? "");
  if (/no such account/i.test(msg)) return true;
  if (/no such destination/i.test(msg)) return true;
  if (err.code === "resource_missing") return true;
  return false;
}

/**
 * Map PaymentIntent create failures (destination invalid) to a buyer-facing message.
 */
export function stripeDestinationErrorResponse(e: unknown): { code: string; message: string } | null {
  if (!isStripeConnectAccountNotFoundError(e)) return null;
  return { code: "SELLER_STRIPE_INVALID", message: SELLER_STRIPE_ACCOUNT_INVALID_MESSAGE };
}
