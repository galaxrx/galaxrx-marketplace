/**
 * Same-seller multi-line cart: one delivery fee, unified GST class (all lines must match).
 */
import { calculatePlatformFee } from "@/lib/platform-fee";
import { getTaxClassification, calculateGst } from "@/lib/tax";
import { calculateDestinationChargeAmounts } from "@/lib/destination-charge";
import {
  getListingQuoteResult,
  CHECKOUT_BLOCKED_PLATFORM_FEE_CODE,
  CHECKOUT_BLOCKED_PLATFORM_FEE_MESSAGE,
} from "@/lib/pricing";

export type CartLineResolved = {
  listingId: string;
  quantity: number;
  unitPriceExGst: number;
  grossAmount: number;
  platformFee: number;
  gstProduct: number;
  netLine: number;
};

export type SellerCartQuote =
  | {
      ok: true;
      lines: CartLineResolved[];
      deliveryFeeExGst: number;
      grossTotal: number;
      platformFeeTotal: number;
      gstAmount: number;
      totalCharged: number;
      netToSeller: number;
      totalChargedCents: number;
      grossAmountCents: number;
      platformFeeCents: number;
      gstAmountCents: number;
      netToSellerCents: number;
      deliveryFeeExGstCents: number;
      taxClassification: string;
    }
  | { ok: false; message: string; code?: string };

function maxDeliveryForTier(
  listings: { deliveryFee?: number | null }[],
  tier: "standard" | "express"
): number {
  let m = 0;
  for (const l of listings) {
    const base = l.deliveryFee ?? 0;
    const express = base > 0 ? base + 15 : 15;
    m = Math.max(m, tier === "express" ? express : base);
  }
  return m;
}

/**
 * Build payable quote for multiple units from the same seller.
 * @param isGstFree — must be identical for every line (caller validates).
 */
export function quoteSellerCart(
  lines: { listingId: string; quantity: number; unitPriceExGst: number; isGstFree: boolean | null }[],
  deliveryFeeExGst: number,
  tier: "standard" | "express",
  listingDeliveryRows: { id: string; deliveryFee?: number | null }[],
  options?: { allowCustomDelivery?: boolean }
): SellerCartQuote {
  if (lines.length === 0) {
    return { ok: false, message: "Cart is empty" };
  }
  const first = lines[0].isGstFree;
  for (const row of lines) {
    if ((row.isGstFree ?? null) !== (first ?? null)) {
      return {
        ok: false,
        message:
          "These items have different GST classifications and cannot be checked out together. Remove items or check out separately.",
        code: "MIXED_GST",
      };
    }
  }
  if (deliveryFeeExGst < 0 || deliveryFeeExGst > 50_000) {
    return { ok: false, message: "Invalid delivery fee." };
  }
  if (!options?.allowCustomDelivery) {
    const maxDel = maxDeliveryForTier(listingDeliveryRows, tier);
    if (deliveryFeeExGst > maxDel + 0.02) {
      return {
        ok: false,
        message: `Invalid delivery fee for this cart (expected up to $${maxDel.toFixed(2)} ex GST for ${tier} shipping).`,
      };
    }
  }

  const resolved: CartLineResolved[] = [];
  let grossTotal = 0;
  let platformFeeTotal = 0;
  let gstProductTotal = 0;

  for (const row of lines) {
    const gross = row.unitPriceExGst * row.quantity;
    const pf = calculatePlatformFee(gross);
    const q = getListingQuoteResult({
      unitPriceExGst: row.unitPriceExGst,
      quantity: row.quantity,
      deliveryFeeExGst: 0,
      isGstFree: row.isGstFree ?? null,
    });
    if (!q.allowed) {
      return { ok: false, message: q.reason, code: q.code };
    }
    const tax = getTaxClassification({ isGstFreeOverride: row.isGstFree ?? undefined });
    const gstLine = calculateGst(gross, tax);
    grossTotal += gross;
    platformFeeTotal += pf;
    gstProductTotal += gstLine;
    resolved.push({
      listingId: row.listingId,
      quantity: row.quantity,
      unitPriceExGst: row.unitPriceExGst,
      grossAmount: gross,
      platformFee: pf,
      gstProduct: gstLine,
      netLine: gross - pf,
    });
  }

  const taxDelivery = getTaxClassification({ isGstFreeOverride: first ?? undefined });
  const gstOnDelivery = calculateGst(deliveryFeeExGst, taxDelivery);
  const gstAmount = gstProductTotal + gstOnDelivery;
  const subtotalExGst = grossTotal + deliveryFeeExGst;
  const totalCharged = subtotalExGst + gstAmount;
  const netToSeller = grossTotal - platformFeeTotal + deliveryFeeExGst;

  const totalChargedCents = Math.round(totalCharged * 100);
  const platformFeeTotalCents = Math.round(platformFeeTotal * 100);
  const netToSellerCentsRounded = Math.round(netToSeller * 100);
  if (platformFeeTotalCents > totalChargedCents || netToSellerCentsRounded < 0) {
    return {
      ok: false,
      message: CHECKOUT_BLOCKED_PLATFORM_FEE_MESSAGE,
      code: CHECKOUT_BLOCKED_PLATFORM_FEE_CODE,
    };
  }

  const dest = calculateDestinationChargeAmounts({
    totalChargedCents,
    platformFeeCents: platformFeeTotalCents,
    gstAmountCents: Math.round(gstAmount * 100),
    netToSellerCents: netToSellerCentsRounded,
  });

  return {
    ok: true,
    lines: resolved,
    deliveryFeeExGst,
    grossTotal,
    platformFeeTotal,
    gstAmount,
    totalCharged,
    netToSeller,
    totalChargedCents: dest.buyerTotalCents,
    grossAmountCents: Math.round(grossTotal * 100),
    platformFeeCents: Math.round(platformFeeTotal * 100),
    gstAmountCents: Math.round(gstAmount * 100),
    netToSellerCents: Math.round(netToSeller * 100),
    deliveryFeeExGstCents: Math.round(deliveryFeeExGst * 100),
    taxClassification: getTaxClassification({ isGstFreeOverride: first ?? undefined }).classification,
  };
}
