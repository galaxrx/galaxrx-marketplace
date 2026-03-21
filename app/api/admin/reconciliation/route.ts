import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * Admin-only reconciliation: list mismatches between orders and Stripe.
 * - Orders with stripePaymentId but no matching Stripe PaymentIntent (or amount mismatch)
 * - Stripe payment_intent.succeeded events with no order (if we had a way to list PIs)
 * For now we only check orders: ensure stripePaymentId is set for STRIPE source and amounts are consistent.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const ordersWithStripe = await prisma.order.findMany({
    where: {
      source: "STRIPE",
      stripePaymentId: { not: null },
    },
    select: {
      id: true,
      stripePaymentId: true,
      grossAmount: true,
      deliveryFee: true,
      gstAmount: true,
      platformFee: true,
      netAmount: true,
      status: true,
    },
  });

  const mismatches: { orderId: string; stripePaymentId: string; issue: string }[] = [];
  if (stripe) {
    for (const order of ordersWithStripe) {
      const piId = order.stripePaymentId!;
      try {
        const pi = await stripe.paymentIntents.retrieve(piId);
        if (pi.status !== "succeeded") {
          mismatches.push({
            orderId: order.id,
            stripePaymentId: piId,
            issue: `PaymentIntent status is ${pi.status}, expected succeeded`,
          });
          continue;
        }
        const expectedTotalCents = Math.round(
          (order.grossAmount + (order.deliveryFee ?? 0) + order.gstAmount) * 100
        );
        if (pi.amount !== expectedTotalCents) {
          mismatches.push({
            orderId: order.id,
            stripePaymentId: piId,
            issue: `Amount mismatch: order total ${expectedTotalCents} cents vs Stripe ${pi.amount} cents`,
          });
        }
      } catch {
        mismatches.push({
          orderId: order.id,
          stripePaymentId: piId,
          issue: "PaymentIntent not found in Stripe",
        });
      }
    }
  }

  const manualOrders = await prisma.order.count({
    where: { source: "MANUAL" },
  });
  const stripeEventsPending = await prisma.stripeEvent.count({
    where: { processingStatus: "PENDING" },
  });
  const stripeEventsFailed = await prisma.stripeEvent.count({
    where: { processingStatus: "FAILED" },
  });

  return NextResponse.json({
    ordersWithStripeChecked: ordersWithStripe.length,
    mismatches,
    manualOrdersCount: manualOrders,
    stripeEventsPending,
    stripeEventsFailed,
  });
}
