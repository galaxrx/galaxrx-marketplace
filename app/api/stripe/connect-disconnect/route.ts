import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Clears the current user's Stripe Connect account ID so they can reconnect.
 * Use when the stored account was created in test mode but the app is now using live keys:
 * "No such destination" means the destination account doesn't exist in the current mode.
 * After disconnecting, "Connect bank account" in Settings will create a new (live) account.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;

  await prisma.pharmacy.update({
    where: { id: pharmacyId },
    data: {
      stripeAccountId: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
    },
  });

  return NextResponse.json({ ok: true, message: "Stripe account disconnected. You can connect again for live payments." });
}
