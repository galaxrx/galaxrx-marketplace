import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { isStripeConnectAccountNotFoundError } from "@/lib/stripe-account-errors";

/**
 * GET: Return the current session's Stripe Connect account health.
 * Used by settings/UI to show connection status and restrictions.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { stripeAccountId: true },
  });
  if (!pharmacy?.stripeAccountId) {
    return NextResponse.json({
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      reason: "NOT_CONNECTED",
    });
  }
  if (!stripe) {
    return NextResponse.json({
      connected: true,
      chargesEnabled: false,
      payoutsEnabled: false,
      reason: "STRIPE_ERROR",
    });
  }
  try {
    const account = await stripe.accounts.retrieve(pharmacy.stripeAccountId);
    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    return NextResponse.json({
      connected: true,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted: account.details_submitted ?? false,
      requirementsCurrentlyDue: account.requirements?.currently_due ?? [],
      requirementsPastDue: account.requirements?.past_due ?? [],
      reason: chargesEnabled && payoutsEnabled ? "HEALTHY" : "RESTRICTED",
    });
  } catch (e: unknown) {
    if (isStripeConnectAccountNotFoundError(e)) {
      return NextResponse.json({
        connected: true,
        chargesEnabled: false,
        payoutsEnabled: false,
        reason: "ACCOUNT_NOT_FOUND",
        needsSellerReconnect: true,
      });
    }
    return NextResponse.json({
      connected: true,
      chargesEnabled: false,
      payoutsEnabled: false,
      reason: "STRIPE_ERROR",
    });
  }
}
