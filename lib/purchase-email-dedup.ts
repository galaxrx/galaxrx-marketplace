import { prisma } from "@/lib/prisma";

export type PurchaseEmailChannel =
  | "SELLER_NEW_SALE"
  | "BUYER_PURCHASE_CONFIRMED"
  | "SELLER_DIRECT_SHIPPING_CONTACT"
  | "BUYER_DIRECT_SHIPPING_CONTACT";

type SendResult = { success: boolean };

/**
 * Runs send() at most once per Stripe PaymentIntent per channel, so duplicate
 * payment_intent.succeeded processing (webhook + reconcile, retries, or overlapping paths)
 * cannot deliver multiple "You sold" / "Purchase confirmed" emails for the same charge.
 */
export async function runOncePerPaymentIntentEmail(
  stripePaymentIntentId: string | undefined | null,
  channel: PurchaseEmailChannel,
  send: () => Promise<SendResult | void>
): Promise<void> {
  if (!stripePaymentIntentId?.startsWith("pi_")) {
    await send();
    return;
  }

  const inserted = await prisma.purchaseEmailDedup.createMany({
    data: [{ stripePaymentIntentId, channel }],
    skipDuplicates: true,
  });

  if (inserted.count === 0) {
    return;
  }

  try {
    const result = await send();
    if (result && result.success === false) {
      await prisma.purchaseEmailDedup.deleteMany({
        where: { stripePaymentIntentId, channel },
      });
    }
  } catch (e) {
    await prisma.purchaseEmailDedup.deleteMany({
      where: { stripePaymentIntentId, channel },
    });
    throw e;
  }
}
