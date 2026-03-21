import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processStripeEventPayload } from "@/app/api/stripe/webhook/route";

const MAX_RETRIES = 5;
const BATCH_SIZE = 30;
/** PENDING events are only retried if older than this (minutes) to avoid racing the initial webhook. */
const PENDING_STALE_MINUTES = 2;
/** Backoff minutes per retry attempt: 5m, 15m, 1h, 4h, 24h (then stop). */
const BACKOFF_MINUTES = [5, 15, 60, 4 * 60, 24 * 60];

function backoffMinutesForRetry(retryCount: number): number {
  const index = Math.min(retryCount, BACKOFF_MINUTES.length - 1);
  return BACKOFF_MINUTES[Math.max(0, index)];
}

/**
 * Scheduled retry worker: loads StripeEvent rows with FAILED or stale PENDING,
 * applies backoff and max-retry cap, and calls processStripeEventPayload(event) for each.
 * Invoked by: POST (admin or Bearer CRON_SECRET), or GET ?run=1 (admin, Bearer CRON_SECRET, or Vercel Cron x-vercel-cron).
 */
function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return Promise.resolve(true);
  return getServerSession(authOptions).then(
    (session) => !!(session?.user && (session.user as { role?: string }).role === "ADMIN")
  );
}

/** True if this request is from Vercel Cron (so GET ?run=1 is allowed to run the batch). */
function isVercelCron(req: Request): boolean {
  return req.headers.get("x-vercel-cron") === "1";
}

type RetryBatchResult = {
  runAt: string;
  attempted: number;
  processed: number;
  failed: number;
  results: { eventId: string; type: string; status: "PROCESSED" | "FAILED"; error?: string }[];
};

/** Runs one batch of retries: queries FAILED/PENDING with backoff, increments retryCount/lastRetryAt, calls processStripeEventPayload. */
async function runRetryBatch(): Promise<RetryBatchResult> {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - PENDING_STALE_MINUTES * 60 * 1000);
  const failedOrPending = await prisma.stripeEvent.findMany({
    where: {
      processingStatus: { in: ["FAILED", "PENDING"] },
      retryCount: { lt: MAX_RETRIES },
    },
    select: {
      id: true,
      eventId: true,
      type: true,
      payloadJson: true,
      processingStatus: true,
      retryCount: true,
      lastRetryAt: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: "asc" },
    take: 500,
  });

  const eligible: typeof failedOrPending = [];
  for (const row of failedOrPending) {
    if (row.processingStatus === "PENDING" && row.receivedAt > staleCutoff) continue;
    const backoffMin = backoffMinutesForRetry(row.retryCount);
    const nextRetryAt = row.lastRetryAt
      ? new Date(row.lastRetryAt.getTime() + backoffMin * 60 * 1000)
      : row.receivedAt ?? now;
    if (nextRetryAt <= now) eligible.push(row);
  }

  const batch = eligible.slice(0, BATCH_SIZE);
  const results: RetryBatchResult["results"] = [];
  let processed = 0;
  let failed = 0;

  for (const row of batch) {
    let event: Stripe.Event;
    try {
      event = JSON.parse(row.payloadJson) as Stripe.Event;
    } catch {
      await prisma.stripeEvent.update({
        where: { id: row.id },
        data: {
          processedAt: now,
          processingStatus: "FAILED",
          errorMessage: "Invalid payloadJson for retry",
          retryCount: row.retryCount + 1,
          lastRetryAt: now,
        },
      });
      results.push({ eventId: row.eventId, type: row.type, status: "FAILED", error: "Invalid payloadJson" });
      failed++;
      continue;
    }

    await prisma.stripeEvent.update({
      where: { id: row.id },
      data: {
        retryCount: row.retryCount + 1,
        lastRetryAt: now,
      },
    });

    try {
      await processStripeEventPayload(event);
      results.push({ eventId: row.eventId, type: row.type, status: "PROCESSED" });
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.stripeEvent.update({
        where: { id: row.id },
        data: {
          processedAt: now,
          processingStatus: "FAILED",
          errorMessage: msg,
        },
      }).catch(() => {});
      results.push({ eventId: row.eventId, type: row.type, status: "FAILED", error: msg });
      failed++;
    }
  }

  return {
    runAt: now.toISOString(),
    attempted: batch.length,
    processed,
    failed,
    results,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const runBatch = searchParams.get("run") === "1" || isVercelCron(req);

  if (runBatch) {
    const allowed = (await isAuthorized(req)) || isVercelCron(req);
    if (!allowed) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const result = await runRetryBatch();
    return NextResponse.json(result);
  }

  if (!(await isAuthorized(req))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const eligible: { id: string; eventId: string; type: string; processingStatus: string; retryCount: number; lastRetryAt: Date | null }[] = [];

  const staleCutoff = new Date(now.getTime() - PENDING_STALE_MINUTES * 60 * 1000);
  const failedOrPending = await prisma.stripeEvent.findMany({
    where: {
      processingStatus: { in: ["FAILED", "PENDING"] },
      retryCount: { lt: MAX_RETRIES },
    },
    select: {
      id: true,
      eventId: true,
      type: true,
      processingStatus: true,
      retryCount: true,
      lastRetryAt: true,
      receivedAt: true,
    },
    orderBy: { receivedAt: "asc" },
    take: 500,
  });

  for (const row of failedOrPending) {
    if (row.processingStatus === "PENDING" && row.receivedAt > staleCutoff) continue;
    const backoffMin = backoffMinutesForRetry(row.retryCount);
    const nextRetryAt = row.lastRetryAt
      ? new Date(row.lastRetryAt.getTime() + backoffMin * 60 * 1000)
      : row.receivedAt ?? now;
    if (nextRetryAt <= now) {
      eligible.push({
        id: row.id,
        eventId: row.eventId,
        type: row.type,
        processingStatus: row.processingStatus,
        retryCount: row.retryCount,
        lastRetryAt: row.lastRetryAt,
      });
    }
  }

  const sample = eligible.slice(0, 20);
  return NextResponse.json({
    eligibleCount: eligible.length,
    sample,
    maxRetries: MAX_RETRIES,
    batchSize: BATCH_SIZE,
  });
}

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const result = await runRetryBatch();
  return NextResponse.json(result);
}
