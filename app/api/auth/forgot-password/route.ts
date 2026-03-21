import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordReset } from "@/lib/resend";
import { z } from "zod";
import crypto from "crypto";
import { addHours } from "date-fns";

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }
    const { email } = parsed.data;
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { email },
    });
    if (!pharmacy) {
      return NextResponse.json({ ok: true });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    await prisma.pharmacy.update({
      where: { id: pharmacy.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: addHours(new Date(), 1),
      },
    });
    await sendPasswordReset(
      pharmacy.email,
      pharmacy.name,
      `${baseUrl}/reset-password?token=${token}`
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to send reset email" },
      { status: 500 }
    );
  }
}
