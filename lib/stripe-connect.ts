import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * Updates Pharmacy.stripeChargesEnabled and stripePayoutsEnabled from a Stripe
 * Connect account.updated event. Used by both the platform webhook and the
 * Connect webhook (Connect events are sent to the Connect endpoint only).
 */
export async function syncPharmacyFromStripeAccount(account: Stripe.Account): Promise<void> {
  const pharmacy = await prisma.pharmacy.findFirst({
    where: { stripeAccountId: account.id },
  });
  if (!pharmacy) return;
  const chargesEnabled = account.charges_enabled ?? false;
  const payoutsEnabled = account.payouts_enabled ?? false;
  if (!chargesEnabled || !payoutsEnabled) {
    console.warn("[GalaxRX] Seller account restricted:", account.id);
  }
  await prisma.pharmacy.update({
    where: { id: pharmacy.id },
    data: {
      stripeChargesEnabled: chargesEnabled,
      stripePayoutsEnabled: payoutsEnabled,
    },
  });
}
