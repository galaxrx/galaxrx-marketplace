import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email("Invalid email address."),
  code: z.string().length(6, "Code must be 6 digits."),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid request.";
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const code = parsed.data.code.trim();

    const record = await prisma.emailVerification.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
    if (!record) {
      return NextResponse.json(
        { ok: false, message: "No verification code found for this email. Please request a new code." },
        { status: 400 }
      );
    }
    if (record.verifiedAt) {
      return NextResponse.json({ ok: true, message: "Email already verified." });
    }
    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { ok: false, message: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }
    if (record.code !== code) {
      return NextResponse.json(
        { ok: false, message: "Invalid verification code." },
        { status: 400 }
      );
    }

    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[verify-email]", e);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
