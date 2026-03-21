import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  normalizeAustralianPostcode,
  isValidAustralianPostcodeForShipping,
} from "@/lib/australian-postcode";

/** Public fields for checkout / shipping (buyer delivery address). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  try {
    const pharmacy = await prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: {
        address: true,
        suburb: true,
        state: true,
        postcode: true,
      },
    });
    if (!pharmacy) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return NextResponse.json(pharmacy);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Failed to load profile" }, { status: 500 });
  }
}

const patchSchema = z
  .object({
    phone: z.string().optional(),
    mobile: z.string().optional().nullable(),
    logoUrl: z.string().url().optional().nullable(),
    postcode: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.postcode === undefined || val.postcode === "") return;
    const n = normalizeAustralianPostcode(val.postcode);
    if (n.length !== 4 || !isValidAustralianPostcodeForShipping(n)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter a valid Australian postcode (4 digits). Placeholders like 0000 are not accepted for shipping.",
        path: ["postcode"],
      });
    }
  });

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { message: first?.message ?? "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data: {
      phone?: string;
      mobile?: string | null;
      logoUrl?: string | null;
      postcode?: string;
    } = {};
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
    if (parsed.data.mobile !== undefined) data.mobile = parsed.data.mobile;
    if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl;
    if (parsed.data.postcode !== undefined && parsed.data.postcode !== "") {
      data.postcode = normalizeAustralianPostcode(parsed.data.postcode);
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }
    await prisma.pharmacy.update({
      where: { id: pharmacyId },
      data,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
