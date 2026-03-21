import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { syncPharmacyFromStripeAccount } from "@/lib/stripe-connect";

/**
 * Connect webhook: receives events for connected accounts (e.g. account.updated).
 * Configure in Stripe Dashboard: Connect → Settings → Webhooks.
 * Uses STRIPE_CONNECT_WEBHOOK_SECRET (different from STRIPE_WEBHOOK_SECRET).
 */
export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { message: "Stripe not configured" },
      { status: 503 }
    );
  }
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { message: "Connect webhook secret required" },
      { status: 400 }
    );
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ message }, { status: 400 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await syncPharmacyFromStripeAccount(account);
  }

  return NextResponse.json({ received: true });
}
