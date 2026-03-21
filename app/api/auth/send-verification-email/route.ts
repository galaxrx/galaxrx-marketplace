import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailVerificationCode } from "@/lib/resend";
import { z } from "zod";

const CODES_EXPIRE_MINUTES = 15;

const bodySchema = z.object({
  email: z.string().email("Invalid email address."),
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
    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    const expiresAt = new Date(Date.now() + CODES_EXPIRE_MINUTES * 60 * 1000);

    await prisma.emailVerification.deleteMany({ where: { email } });
    await prisma.emailVerification.create({
      data: { email, code, expiresAt },
    });

    const result = await sendEmailVerificationCode(email, code);
    if (!result.success) {
      console.error("[send-verification-email] Resend failed:", result.error);
      return NextResponse.json(
        { ok: false, message: "Could not send verification email. Please try again later." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[send-verification-email]", e);
    return NextResponse.json(
      { ok: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
