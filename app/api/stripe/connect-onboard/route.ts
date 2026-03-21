import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

function isStripeError(e: unknown): e is { message?: string; code?: string } {
  return typeof e === "object" && e !== null && "message" in e;
}

export async function POST(req: Request) {
  if (!stripe) {
    // Help debug: log in server terminal only (never log the actual key)
    const raw = process.env.STRIPE_SECRET_KEY;
    const hasKey = raw !== undefined && raw !== null;
    const nonEmpty = typeof raw === "string" && raw.trim().length > 0;
    console.warn(
      "[Stripe] 503: STRIPE_SECRET_KEY present in env:",
      hasKey,
      "non-empty after trim:",
      nonEmpty,
      "— Use .env in project root and restart the dev server."
    );
    return NextResponse.json(
      {
        message:
          "Stripe is not configured. Add STRIPE_SECRET_KEY to .env in the project root (same folder as package.json) and restart the dev server.",
      },
      { status: 503 }
    );
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: { stripeAccountId: true, email: true },
  });
  if (!pharmacy) {
    return NextResponse.json({ message: "Pharmacy not found" }, { status: 404 });
  }
  const email = (pharmacy.email || "").trim();
  if (!email) {
    return NextResponse.json(
      { message: "Pharmacy email is missing. Add an email in your profile before connecting a bank account." },
      { status: 400 }
    );
  }
  // Use request origin when available (e.g. ngrok HTTPS) so Stripe redirect URLs are HTTPS in live mode
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const baseUrl =
    host && proto === "https"
      ? `https://${host}`
      : (process.env.NEXTAUTH_URL ?? "http://localhost:3000");
  try {
    let accountId = pharmacy.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        country: "AU",
        email,
      });
      accountId = account.id;
      await prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: { stripeAccountId: accountId },
      });
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/settings?stripe=refresh`,
      return_url: `${baseUrl}/settings?stripe=success`,
      type: "account_onboarding",
    });
    if (!link.url) {
      return NextResponse.json(
        { message: "Stripe did not return a link. Please try again." },
        { status: 500 }
      );
    }
    return NextResponse.json({ url: link.url });
  } catch (e) {
    console.error("Stripe connect-onboard error:", e);
    let message = isStripeError(e)
      ? (e.message || "Stripe error. Please try again.")
      : "Failed to create onboarding link. Please try again.";
    // When Connect isn't enabled on the Stripe account, point the user to enable it
    if (
      typeof message === "string" &&
      message.toLowerCase().includes("signed up for connect")
    ) {
      message =
        "Stripe Connect is not enabled for your Stripe account. Sign up for Connect at https://dashboard.stripe.com/connect, then try connecting your bank account again.";
    }
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
