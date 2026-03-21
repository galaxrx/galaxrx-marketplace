import { NextResponse } from "next/server";
import { getDomesticParcelRates } from "@/lib/auspost";
import {
  normalizeAustralianPostcode,
  isValidAustralianPostcodeForShipping,
} from "@/lib/australian-postcode";

export async function GET(req: Request) {
  const raw = process.env.AUSPOST_API_KEY;
  const apiKey = raw?.trim();
  if (!apiKey) {
    const hasKey = raw !== undefined && raw !== null;
    const nonEmpty = typeof raw === "string" && raw.trim().length > 0;
    console.warn(
      "[AusPost] 503: AUSPOST_API_KEY present in env:",
      hasKey,
      "non-empty after trim:",
      nonEmpty,
      "— Use .env in project root and restart the dev server."
    );
    return NextResponse.json(
      {
        message:
          "Australia Post API key is not configured. Add AUSPOST_API_KEY to .env in the project root (same folder as package.json) and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const fromPostcode = searchParams.get("from_postcode") ?? "";
  const toPostcode = searchParams.get("to_postcode") ?? "";
  const weightKg = searchParams.get("weight_kg");
  const lengthCm = searchParams.get("length_cm");
  const widthCm = searchParams.get("width_cm");
  const heightCm = searchParams.get("height_cm");

  if (!fromPostcode.trim() || !toPostcode.trim()) {
    return NextResponse.json(
      { message: "from_postcode and to_postcode are required." },
      { status: 400 }
    );
  }

  const fromNorm = normalizeAustralianPostcode(fromPostcode);
  const toNorm = normalizeAustralianPostcode(toPostcode);
  if (!isValidAustralianPostcodeForShipping(fromNorm)) {
    return NextResponse.json(
      {
        message:
          "Sender postcode is not valid for Australia Post (e.g. 0000 or incomplete). The seller must update their pharmacy postcode in Settings.",
        code: "INVALID_FROM_POSTCODE",
      },
      { status: 400 }
    );
  }
  if (!isValidAustralianPostcodeForShipping(toNorm)) {
    return NextResponse.json(
      {
        message:
          "Delivery postcode is not valid. Update your pharmacy address postcode in Settings.",
        code: "INVALID_TO_POSTCODE",
      },
      { status: 400 }
    );
  }

  try {
    const rates = await getDomesticParcelRates(apiKey, {
      fromPostcode: fromNorm,
      toPostcode: toNorm,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      lengthCm: lengthCm ? parseFloat(lengthCm) : undefined,
      widthCm: widthCm ? parseFloat(widthCm) : undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
    });
    return NextResponse.json({ services: rates });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to get Australia Post rates.";
    console.error("[AusPost calculate]", e);
    return NextResponse.json({ message }, { status: 500 });
  }
}
