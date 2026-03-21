import { NextResponse } from "next/server";
import { sendPublicEnquiryEmail } from "@/lib/resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const { name, email, topic, message, company } = body as Record<string, unknown>;
    if (typeof company === "string" && company.trim() !== "") {
      return NextResponse.json({ ok: true });
    }

    if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 200) {
      return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.length > 320) {
      return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
    }
    if (topic !== "general" && topic !== "advertising") {
      return NextResponse.json({ ok: false, error: "Please choose a topic." }, { status: 400 });
    }
    if (typeof message !== "string" || message.trim().length < 10 || message.trim().length > 8000) {
      return NextResponse.json(
        { ok: false, error: "Please enter a message (at least 10 characters)." },
        { status: 400 }
      );
    }

    const result = await sendPublicEnquiryEmail({
      fromName: name.trim(),
      fromEmail: email.trim(),
      topic,
      message: message.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: "We couldn’t send your message. Please try email instead." },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong." }, { status: 500 });
  }
}
