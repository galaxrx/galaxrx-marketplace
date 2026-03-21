import { NextResponse } from "next/server";
import { verifyPharmacyByCode } from "@/lib/register-of-pharmacies-api";
import { z } from "zod";

const bodySchema = z.object({
  code: z.string().min(1, "Pharmacy code is required."),
});

/**
 * POST /api/auth/verify-pharmacy
 * Body: { code: string } — pharmacy registration/approval code
 * Returns: { ok: true, pharmacy?: {...} } or { ok: false, message: string }
 * Used during registration to verify the pharmacist/pharmacy before allowing sign-up.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid request.";
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }
    const result = await verifyPharmacyByCode(parsed.data.code);
    if (!result.ok) {
      const message = result.message ?? "Verification failed.";
      const status = /temporarily unavailable|try again later/i.test(message) ? 503 : 400;
      return NextResponse.json(
        { ok: false, message },
        { status }
      );
    }
    return NextResponse.json({
      ok: true,
      pharmacy: result.pharmacy,
    });
  } catch (e) {
    console.error("[verify-pharmacy]", e);
    return NextResponse.json(
      { ok: false, message: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
