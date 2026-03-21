import Stripe from "stripe";
import { GST_RATE } from "./tax";
import {
  PLATFORM_FEE_PERCENT,
  MIN_PLATFORM_FEE,
  calculatePlatformFee as calcPlatformFee,
} from "./platform-fee";

// Trim so "  " or trailing newline in .env doesn't break; Next.js loads .env from project root at startup
const secret = process.env.STRIPE_SECRET_KEY?.trim();
export const stripe =
  secret && secret.length > 0
    ? new Stripe(secret, {
        apiVersion: "2025-02-24.acacia",
        typescript: true,
      })
    : null;

export { GST_RATE } from "./tax";
export { PLATFORM_FEE_PERCENT, MIN_PLATFORM_FEE } from "./platform-fee";

/** Platform fee: 3.5% of product ex GST (min $1.50); excludes delivery and buyer GST. Re-exported from platform-fee. */
export function calculatePlatformFee(grossAmount: number): number {
  return calcPlatformFee(grossAmount);
}
