import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";

/** Stripe idempotency keys: [a-zA-Z0-9_-], max 255 chars. */
function sanitizeIdempotencyKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 255);
}

/**
 * Create a refund for a Stripe-paid order.
 * Admin only. For destination charges: refunds the charge on platform account.
 * Persists Refund record, order status, and listing stock in a single DB transaction
 * so platform state stays consistent. Stripe refund is created with an idempotency key
 * (from header Idempotency-Key or derived from orderId+amount) so retries after DB
 * rollback return the same Stripe refund instead of creating a second one.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "Only administrators can create refunds." },
      { status: 403 }
    );
  }
  if (!stripe) {
    return NextResponse.json(
      { message: "Stripe not configured" },
      { status: 503 }
    );
  }
  const { id: orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  if (!order.stripePaymentId) {
    return NextResponse.json(
      { message: "Order was not paid via Stripe. Cannot refund via this flow." },
      { status: 400 }
    );
  }
  if (["REFUNDED", "REFUNDED_FULL", "REFUNDED_PARTIAL"].includes(order.status)) {
    return NextResponse.json(
      { message: "Order already refunded." },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const amountCents = typeof body.amountCents === "number" ? body.amountCents : null;
  const reason = typeof body.reason === "string" ? body.reason : null;

  // Use authoritative cents total persisted at order creation. Legacy orders without it: fallback to float recompute only for those rows.
  const totalChargedCents =
    order.totalChargedCents ??
    Math.round((order.grossAmount + (order.deliveryFee ?? 0) + order.gstAmount) * 100);
  const refundAmountCents = amountCents ?? totalChargedCents;
  if (refundAmountCents <= 0 || refundAmountCents > totalChargedCents) {
    return NextResponse.json(
      { message: "Invalid refund amount." },
      { status: 400 }
    );
  }

  try {
    // Charge model is persisted on the order at creation; use DB as authoritative source.
    // Legacy orders without chargeModel: treat as "destination" (all current/historic PIs are destination).
    const chargeModel = order.chargeModel ?? "destination";

    // Refunds are only supported for destination charges (platform-created PI).
    // Direct charge mode is disabled; any order with chargeModel "direct" is legacy
    // and would require connected-account context to refund — not implemented.
    if (chargeModel === "direct") {
      return NextResponse.json(
        {
          message:
            "Refunds for direct-charge orders are not supported. Direct charge mode is disabled. " +
            "Process this refund in the Stripe Dashboard for the connected account, or contact support.",
        },
        { status: 503 }
      );
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: order.stripePaymentId,
      amount: refundAmountCents,
      reason: "requested_by_customer",
      refund_application_fee: true,
      reverse_transfer: true,
      metadata: { orderId, chargeModel },
    };

    const headerKey = req.headers.get("Idempotency-Key")?.trim();
    const derivedKey = `refund-${orderId}-${refundAmountCents}`;
    const idempotencyKey = sanitizeIdempotencyKey(headerKey || derivedKey);

    const refund = await stripe.refunds.create(refundParams, { idempotencyKey });

    const newStatus = refundAmountCents >= totalChargedCents ? "REFUNDED_FULL" : "REFUNDED_PARTIAL";

    // Single atomic transaction: Refund record + order status + listing stock.
    // If any step fails, all DB changes roll back. Stripe call used idempotencyKey above,
    // so retrying the same request returns the same refund and transaction can succeed.
    await prisma.$transaction(async (tx) => {
      await tx.refund.create({
        data: {
          orderId: order.id,
          stripeRefundId: refund.id,
          amountCents: refundAmountCents,
          reason: reason ?? undefined,
          initiatorId: (session.user as { id: string }).id,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      if (order.source === "STRIPE" && order.listingId && newStatus === "REFUNDED_FULL") {
        await tx.listing.update({
          where: { id: order.listingId },
          data: {
            quantityUnits: { increment: order.quantity },
            isActive: true,
          },
        });
      }
    });

    return NextResponse.json({
      refundId: refund.id,
      amountCents: refundAmountCents,
      orderStatus: newStatus,
    });
  } catch (e) {
    console.error("Refund error:", e instanceof Error ? e.message : String(e), e);
    if (e instanceof Stripe.errors.StripeIdempotencyError) {
      return NextResponse.json(
        {
          message:
            "Idempotency key was already used for a different refund request. Use a new key or the same request body.",
        },
        { status: 409 }
      );
    }
    const message = e instanceof Error ? e.message : "Refund failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
