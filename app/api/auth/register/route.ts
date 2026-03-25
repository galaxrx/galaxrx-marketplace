import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendRegistrationReceived } from "@/lib/resend";
import { verifyPharmacyByCode } from "@/lib/register-of-pharmacies-api";
import { z } from "zod";
import {
  normalizeAustralianPostcode,
  isValidAustralianPostcodeForShipping,
} from "@/lib/australian-postcode";

const schema = z.object({
  name: z.string().min(1),
  abn: z.string().length(11),
  approvalNumber: z.string().min(1),
  address: z.string().min(1),
  suburb: z.string().min(1),
  state: z.enum(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]),
  postcode: z
    .string()
    .min(1)
    .transform((s) => normalizeAustralianPostcode(s))
    .refine((s) => isValidAustralianPostcodeForShipping(s), {
      message: "Enter a valid Australian postcode (not 0000 or other placeholders).",
    }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().min(1),
  mobile: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(8),
  verificationDocs: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? parsed.error.message;
      return NextResponse.json(
        { message: msg },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const emailLower = data.email.trim().toLowerCase();
    const existing = await prisma.pharmacy.findFirst({
      where: { email: { equals: emailLower, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 400 }
      );
    }
    const existingAbn = await prisma.pharmacy.findUnique({
      where: { abn: data.abn },
    });
    if (existingAbn) {
      return NextResponse.json(
        { message: "An account with this ABN already exists." },
        { status: 400 }
      );
    }
    const verified = await prisma.emailVerification.findFirst({
      where: { email: emailLower, verifiedAt: { not: null } },
      orderBy: { verifiedAt: "desc" },
    });
    const VERIFIED_WITHIN_MS = 30 * 60 * 1000;
    if (!verified?.verifiedAt || Date.now() - verified.verifiedAt.getTime() > VERIFIED_WITHIN_MS) {
      return NextResponse.json(
        { message: "Please verify your email with the code we sent before completing registration." },
        { status: 400 }
      );
    }
    // Verify pharmacy approval number against Register of Pharmacies API when configured
    const ropAuth = process.env.REGISTER_OF_PHARMACIES_AUTH_HEADER?.trim()
      || (process.env.REGISTER_OF_PHARMACIES_API_KEY && process.env.REGISTER_OF_PHARMACIES_API_SECRET);
    if (process.env.REGISTER_OF_PHARMACIES_API_BASE_URL && ropAuth) {
      const verification = await verifyPharmacyByCode(data.approvalNumber);
      if (!verification.ok) {
        return NextResponse.json(
          { message: verification.message ?? "This pharmacy approval number could not be verified." },
          { status: 400 }
        );
      }
    }
    const passwordHash = await hash(data.password, 12);
    await prisma.pharmacy.create({
      data: {
        name: data.name,
        abn: data.abn,
        approvalNumber: data.approvalNumber,
        address: data.address,
        suburb: data.suburb,
        state: data.state,
        postcode: data.postcode,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        phone: data.phone,
        mobile: data.mobile ?? null,
        email: emailLower,
        passwordHash,
        verificationDocs: data.verificationDocs,
        isVerified: false, // Admin must approve before they can list or buy
        role: "PHARMACY",
      },
    });
    await sendRegistrationReceived(emailLower, data.name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
