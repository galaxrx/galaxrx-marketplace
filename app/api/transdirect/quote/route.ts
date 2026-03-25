import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTransdirectQuote, normalizeTransdirectError, type TransdirectQuoteInput } from "@/lib/transdirect";
import { z } from "zod";

const parcelSchema = z.object({
  weightKg: z.number().positive(),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
});

const schema = z.object({
  senderPostcode: z.string().min(4),
  senderSuburb: z.string().optional(),
  senderState: z.string().optional(),
  senderBuildingType: z.enum(["commercial", "residential"]).default("commercial"),
  receiverPostcode: z.string().min(4),
  receiverSuburb: z.string().optional(),
  receiverState: z.string().optional(),
  receiverBuildingType: z.enum(["commercial", "residential"]).default("commercial"),
  parcels: z.array(parcelSchema).min(1),
  authorityToLeave: z.boolean().optional(),
  transitWarranty: z.boolean().optional(),
  pickupDate: z.string().optional(),
  reference: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid quote input." }, { status: 400 });
    }
    const options = await getTransdirectQuote(parsed.data as TransdirectQuoteInput);
    if (!options.length) {
      return NextResponse.json({ message: "No shipping options returned." }, { status: 502 });
    }
    return NextResponse.json({ options });
  } catch (error) {
    const normalized = normalizeTransdirectError(error);
    return NextResponse.json({ message: normalized.message, code: normalized.code }, { status: 502 });
  }
}
