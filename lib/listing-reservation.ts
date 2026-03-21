/**
 * Listing reservation lifecycle: durable, release-safe, tied to PaymentAttempt.
 * - Reserve once per PaymentAttempt (idempotent by idempotencyKey).
 * - Consume on payment success (webhook).
 * - Release on failure / cancel / expiry (idempotent).
 * - Stale detection and repair for job or admin.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const RESERVATION_STATUS = {
  ACTIVE: "ACTIVE",
  CONSUMED: "CONSUMED",
  RELEASED: "RELEASED",
  EXPIRED: "EXPIRED",
} as const;

export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

/** Result of release: whether we released or already terminal */
export type ReleaseResult =
  | { released: true; listingId: string; quantity: number }
  | { released: false; reason: "not_found" | "not_listing" | "already_released" };

/**
 * Release a listing reservation if it is still ACTIVE. Idempotent and safe:
 * - Only decrements listing.reservedUnits when reservationStatus is ACTIVE.
 * - Sets reservationStatus to RELEASED (or EXPIRED if expiresAt passed).
 * Call from webhooks (payment_failed, canceled) or from cleanup job.
 */
export async function releaseListingReservationIfActive(
  tx: Prisma.TransactionClient,
  params: { paymentAttemptId?: string; stripePaymentIntentId?: string }
): Promise<ReleaseResult> {
  const { paymentAttemptId, stripePaymentIntentId } = params;
  if (!paymentAttemptId && !stripePaymentIntentId) {
    return { released: false, reason: "not_found" };
  }

  const attempt = await tx.paymentAttempt.findFirst({
    where: paymentAttemptId
      ? { id: paymentAttemptId }
      : { stripePaymentIntentId: stripePaymentIntentId! },
    select: {
      id: true,
      listingId: true,
      quantity: true,
      reservationStatus: true,
      expiresAt: true,
    },
  });

  if (!attempt) return { released: false, reason: "not_found" };
  if (!attempt.listingId) return { released: false, reason: "not_listing" };
  if (attempt.reservationStatus !== RESERVATION_STATUS.ACTIVE) {
    return { released: false, reason: "already_released" };
  }

  const listing = await tx.listing.findUnique({
    where: { id: attempt.listingId },
    select: { id: true, reservedUnits: true },
  });
  if (!listing) {
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { reservationStatus: RESERVATION_STATUS.RELEASED },
    });
    return { released: true, listingId: attempt.listingId, quantity: attempt.quantity };
  }

  const newReserved = Math.max(0, listing.reservedUnits - attempt.quantity);
  const finalStatus =
    attempt.expiresAt < new Date() ? RESERVATION_STATUS.EXPIRED : RESERVATION_STATUS.RELEASED;

  await tx.listing.update({
    where: { id: attempt.listingId },
    data: { reservedUnits: newReserved },
  });
  await tx.paymentAttempt.update({
    where: { id: attempt.id },
    data: { reservationStatus: finalStatus },
  });

  return { released: true, listingId: attempt.listingId, quantity: attempt.quantity };
}

/**
 * Expire a listing reservation if it is still ACTIVE and past expiresAt.
 * - Uses releaseListingReservationIfActive to adjust reservedQty + reservationStatus.
 * - Ensures PaymentAttempt.status is set to EXPIRED unless it is already a stronger
 *   terminal state (PAID, FAILED, CANCELED, EXPIRED).
 * - Idempotent: safe to call multiple times.
 */
export async function expireListingReservationIfActive(
  tx: Prisma.TransactionClient,
  params: { paymentAttemptId?: string; stripePaymentIntentId?: string }
): Promise<ReleaseResult> {
  const result = await releaseListingReservationIfActive(tx, params);

  if (!result.released) {
    return result;
  }

  const { paymentAttemptId, stripePaymentIntentId } = params;
  const attempt = await tx.paymentAttempt.findFirst({
    where: paymentAttemptId
      ? { id: paymentAttemptId }
      : { stripePaymentIntentId: stripePaymentIntentId! },
    select: {
      id: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!attempt) return result;

  const now = new Date();
  if (attempt.expiresAt >= now) {
    // Not actually expired yet; do not force EXPIRED status.
    return result;
  }

  if (!["PAID", "FAILED", "CANCELED", "EXPIRED"].includes(attempt.status)) {
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" },
    });
  }

  return result;
}

/**
 * Find listing PaymentAttempts that are still ACTIVE but should be released:
 * - payment not succeeded (status !== PAID)
 * - and either expired (expiresAt < now) or terminal (FAILED, EXPIRED, CANCELED).
 * Safe to call repeatedly; used by repair or cron.
 */
export async function findStaleListingReservations(): Promise<
  { id: string; listingId: string; quantity: number; expiresAt: Date; status: string }[]
> {
  const now = new Date();
  const attempts = await prisma.paymentAttempt.findMany({
    where: {
      listingId: { not: null },
      reservationStatus: RESERVATION_STATUS.ACTIVE,
      status: { not: "PAID" },
      OR: [{ expiresAt: { lt: now } }, { status: { in: ["FAILED", "EXPIRED", "CANCELED"] } }],
    },
    select: {
      id: true,
      listingId: true,
      quantity: true,
      expiresAt: true,
      status: true,
    },
  });
  return attempts as { id: string; listingId: string; quantity: number; expiresAt: Date; status: string }[];
}

/**
 * Release all stale listing reservations in a single transaction. Job-ready:
 * call from cron or admin trigger. Idempotent.
 */
/**
 * Release expired checkout holds for specific listings (e.g. before reading stock).
 * Fixes stuck "all held in checkout" when no cron runs.
 */
export async function releaseExpiredReservationsForListingIds(
  listingIds: string[]
): Promise<void> {
  const unique = [...new Set(listingIds.filter(Boolean))];
  if (unique.length === 0) return;
  const now = new Date();
  const stale = await prisma.paymentAttempt.findMany({
    where: {
      listingId: { in: unique },
      reservationStatus: RESERVATION_STATUS.ACTIVE,
      expiresAt: { lt: now },
      status: { not: "PAID" },
    },
    select: { id: true },
  });
  for (const s of stale) {
    try {
      await prisma.$transaction((tx) =>
        expireListingReservationIfActive(tx, { paymentAttemptId: s.id })
      );
    } catch {
      /* next */
    }
  }
}

/**
 * Release expired/terminal holds, then set reservedUnits = sum of real active (non-expired) holds.
 * Fixes ghost "all units in checkout" when DB reservedUnits drifted or releases never ran.
 */
export async function reconcileListingReservedUnits(listingId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const listing = await tx.listing.findUnique({
      where: { id: listingId },
      select: { quantityUnits: true },
    });
    if (!listing) return;

    const stale = await tx.paymentAttempt.findMany({
      where: {
        listingId,
        reservationStatus: RESERVATION_STATUS.ACTIVE,
        status: { not: "PAID" },
        OR: [
          { expiresAt: { lt: now } },
          { status: { in: ["FAILED", "EXPIRED", "CANCELED"] } },
        ],
      },
      select: { id: true },
    });
    for (const s of stale) {
      await expireListingReservationIfActive(tx, { paymentAttemptId: s.id });
    }

    const activeHolds = await tx.paymentAttempt.findMany({
      where: {
        listingId,
        reservationStatus: RESERVATION_STATUS.ACTIVE,
        expiresAt: { gt: now },
        status: { not: "PAID" },
      },
      select: { quantity: true },
    });
    const sum = Math.min(
      activeHolds.reduce((acc, h) => acc + h.quantity, 0),
      listing.quantityUnits
    );

    await tx.listing.update({
      where: { id: listingId },
      data: { reservedUnits: sum },
    });
  });
}

/** Seller-only: clear every open hold on a listing (use when stuck; may interrupt a buyer mid-checkout). */
export async function sellerForceReleaseListingHolds(
  listingId: string,
  sellerPharmacyId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { pharmacyId: true },
  });
  if (!listing) return { ok: false, message: "Listing not found" };
  if (listing.pharmacyId !== sellerPharmacyId) {
    return { ok: false, message: "Forbidden" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.paymentAttempt.updateMany({
      where: {
        listingId,
        reservationStatus: RESERVATION_STATUS.ACTIVE,
        status: { not: "PAID" },
      },
      data: {
        reservationStatus: RESERVATION_STATUS.RELEASED,
        status: "CANCELED",
      },
    });
    await tx.listing.update({
      where: { id: listingId },
      data: { reservedUnits: 0 },
    });
  });

  return { ok: true };
}

/**
 * Release up to N stale checkout holds before marketplace queries.
 * Buy Items / listings API did not run this before — abandoned checkouts could hide single-unit listings forever until cart/cron touched them.
 */
export async function releaseStaleListingReservationsBatch(maxAttempts = 120): Promise<void> {
  const now = new Date();
  const stale = await prisma.paymentAttempt.findMany({
    where: {
      listingId: { not: null },
      reservationStatus: RESERVATION_STATUS.ACTIVE,
      status: { not: "PAID" },
      OR: [
        { expiresAt: { lt: now } },
        { status: { in: ["FAILED", "EXPIRED", "CANCELED"] } },
      ],
    },
    take: maxAttempts,
    orderBy: { expiresAt: "asc" },
    select: { id: true },
  });
  for (const s of stale) {
    try {
      await prisma.$transaction((tx) =>
        expireListingReservationIfActive(tx, { paymentAttemptId: s.id })
      );
    } catch {
      /* continue */
    }
  }
}

let staleReleaseInFlight: Promise<void> | null = null;
let staleReleaseLastRunAt = 0;

/**
 * Throttled wrapper for stale reservation cleanup.
 * Prevents expensive cleanup from running on every single page/API request.
 */
export async function releaseStaleListingReservationsBatchThrottled(
  options?: { maxAttempts?: number; minIntervalMs?: number }
): Promise<void> {
  const maxAttempts = options?.maxAttempts ?? 40;
  const minIntervalMs = options?.minIntervalMs ?? 60_000;
  const now = Date.now();

  if (now - staleReleaseLastRunAt < minIntervalMs) return;
  if (staleReleaseInFlight) {
    await staleReleaseInFlight;
    return;
  }

  staleReleaseInFlight = (async () => {
    try {
      await releaseStaleListingReservationsBatch(maxAttempts);
    } finally {
      staleReleaseLastRunAt = Date.now();
      staleReleaseInFlight = null;
    }
  })();

  await staleReleaseInFlight;
}

export async function repairStaleListingReservations(): Promise<{
  processed: number;
  released: number;
  errors: { attemptId: string; error: string }[];
}> {
  const stale = await findStaleListingReservations();
  const errors: { attemptId: string; error: string }[] = [];
  let released = 0;

  for (const s of stale) {
    try {
      const result = await prisma.$transaction(async (tx) =>
        expireListingReservationIfActive(tx, { paymentAttemptId: s.id })
      );
      if (result.released) released++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ attemptId: s.id, error: msg });
    }
  }

  return { processed: stale.length, released, errors };
}
