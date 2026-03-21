import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resend } from "@/lib/resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "GalaxRX <onboarding@resend.dev>";

/**
 * GET /api/admin/check-email
 * Admin only. Returns whether Resend is configured (for debugging).
 * Does not expose the API key.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    configured: !!resend,
    fromEmail: FROM_EMAIL,
    message: resend
      ? "Resend API key is loaded. Emails should send."
      : "RESEND_API_KEY is missing or empty. Add it to .env and restart the server.",
  });
}
