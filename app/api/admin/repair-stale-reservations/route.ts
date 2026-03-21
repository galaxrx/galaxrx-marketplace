import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findStaleListingReservations,
  repairStaleListingReservations,
} from "@/lib/listing-reservation";

/**
 * Admin / job endpoint for stale listing reservation repair.
 * - GET: list stale reservations (payment attempt ACTIVE, not PAID, expired or terminal).
 * - POST: run repair (release each stale reservation). Idempotent.
 * Secured by admin role. For cron, call with admin session or add a shared secret if needed.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const stale = await findStaleListingReservations();
  return NextResponse.json({ count: stale.length, stale });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const result = await repairStaleListingReservations();
  return NextResponse.json(result);
}
