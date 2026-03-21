import type { Prisma } from "@prisma/client";

/**
 * Release reserved units for all lines of a cart checkout after payment failure/cancel.
 */
export async function releaseCartCheckoutReservations(
  tx: Prisma.TransactionClient,
  stripePaymentIntentId: string
): Promise<{ released: boolean; lineCount: number }> {
  const attempt = await tx.cartCheckoutAttempt.findFirst({
    where: { stripePaymentIntentId },
    include: { lines: true },
  });
  if (!attempt || attempt.status === "PAID" || attempt.status === "CONSUMED") {
    return { released: false, lineCount: 0 };
  }
  for (const line of attempt.lines) {
    const listing = await tx.listing.findUnique({
      where: { id: line.listingId },
      select: { reservedUnits: true },
    });
    if (listing) {
      const next = Math.max(0, listing.reservedUnits - line.quantity);
      await tx.listing.update({
        where: { id: line.listingId },
        data: { reservedUnits: next },
      });
    }
  }
  await tx.cartCheckoutAttempt.update({
    where: { id: attempt.id },
    data: { status: "RELEASED" },
  });
  return { released: true, lineCount: attempt.lines.length };
}
