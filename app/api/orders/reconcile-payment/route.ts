import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { processStripeEventPayload } from "@/app/api/stripe/webhook/route";

/**
 * If payment succeeded but the Stripe webhook never ran (e.g. local dev, wrong webhook URL),
 * the buyer can POST their PaymentIntent id here to create orders + trigger invoice emails.
 * Idempotent: safe to call again after a successful sync.
 */
export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ message: "Stripe not configured" }, { status: 503 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const buyerId = (session.user as { id: string }).id;
  let body: { paymentIntentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }
  const paymentIntentId = body.paymentIntentId?.trim();
  if (!paymentIntentId?.startsWith("pi_")) {
    return NextResponse.json(
      { message: "paymentIntentId required (from Stripe: pi_...)" },
      { status: 400 }
    );
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") {
    return NextResponse.json(
      { message: `Payment is ${pi.status}, not succeeded yet` },
      { status: 400 }
    );
  }
  if (pi.metadata?.buyerId !== buyerId) {
    return NextResponse.json(
      { message: "This payment is not linked to your pharmacy account" },
      { status: 403 }
    );
  }

  const eventId = `reconcile-${paymentIntentId}`;
  const existing = await prisma.stripeEvent.findUnique({
    where: { eventId },
    select: { processingStatus: true },
  });
  if (existing?.processingStatus === "PROCESSED") {
    const existingOrders = await prisma.order.findMany({
      where: { stripePaymentId: paymentIntentId, buyerId },
      select: { listingId: true },
    });
    const purchasedListingIds = existingOrders
      .map((o) => o.listingId)
      .filter((id): id is string => id != null);
    return NextResponse.json({
      ok: true,
      message: "Already synced — check Orders.",
      purchasedListingIds,
    });
  }

  const synthetic = {
    id: eventId,
    object: "event" as const,
    api_version: "2024-11-20.acacia",
    created: Math.floor(Date.now() / 1000),
    type: "payment_intent.succeeded" as const,
    data: { object: pi },
    livemode: pi.livemode ?? false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event;

  await prisma.stripeEvent.upsert({
    where: { eventId },
    create: {
      eventId,
      type: synthetic.type,
      payloadJson: JSON.stringify(synthetic),
      processingStatus: "PENDING",
    },
    update: {
      type: synthetic.type,
      payloadJson: JSON.stringify(synthetic),
      processingStatus: "PENDING",
      errorMessage: null,
    },
  });

  try {
    await processStripeEventPayload(synthetic);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.stripeEvent
      .update({
        where: { eventId },
        data: {
          processedAt: new Date(),
          processingStatus: "FAILED",
          errorMessage: msg.slice(0, 2000),
        },
      })
      .catch(() => {});
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }

  const syncedOrders = await prisma.order.findMany({
    where: { stripePaymentId: paymentIntentId, buyerId },
    select: { listingId: true },
  });
  const purchasedListingIds = syncedOrders
    .map((o) => o.listingId)
    .filter((id): id is string => id != null);

  return NextResponse.json({
    ok: true,
    message: "Synced. Refresh your Orders page.",
    purchasedListingIds,
  });
}
