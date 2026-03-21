/**
 * Admin accounting export: deterministic money columns for finance.
 * Prefer totalChargedCents on Order when set; else round from stored floats (legacy).
 */

import type { Order, Prisma } from "@prisma/client";

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    buyer: { select: { name: true; abn: true } };
    seller: { select: { name: true; abn: true } };
    listing: { select: { productName: true } };
    wantedOffer: { include: { wantedItem: { select: { productName: true } } } };
    refunds: true;
  };
}>;

export type AccountingOrderRow = Record<string, string | number>;

export type AccountingSummary = {
  orderCount: number;
  sumBuyerTotalCents: number;
  /** Same as sumBuyerTotalCents: GST-inclusive amount charged to the buyer for the line. */
  sumRevenueAfterTaxCents: number;
  /** Buyer total less GST on the order line (ex-GST revenue base for the sale). */
  sumRevenueBeforeTaxCents: number;
  sumPlatformFeeCents: number;
  sumGstCents: number;
  sumSellerCommercialNetCents: number;
  sumTransferToSellerCents: number;
  sumRefundedCents: number;
  stripeOrderCount: number;
  manualOrderCount: number;
  legacyAmountCount: number;
};

function roundMoneyFromFloat(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Authoritative buyer total for this order line in cents. */
export function buyerTotalCents(
  o: Pick<Order, "totalChargedCents" | "grossAmount" | "deliveryFee" | "gstAmount">
): { cents: number; basis: "totalChargedCents" | "computed_float" } {
  if (o.totalChargedCents != null) {
    return { cents: o.totalChargedCents, basis: "totalChargedCents" };
  }
  const c = Math.round((o.grossAmount + (o.deliveryFee ?? 0) + o.gstAmount) * 100);
  return { cents: c, basis: "computed_float" };
}

export function platformFeeCents(o: Pick<Order, "platformFee">): number {
  return Math.round(o.platformFee * 100);
}

export function gstCents(o: Pick<Order, "gstAmount">): number {
  return Math.round(o.gstAmount * 100);
}

/** GST-inclusive gross revenue for the order line (amount charged to buyer). */
export function orderRevenueAfterTaxCents(
  o: Pick<Order, "totalChargedCents" | "grossAmount" | "deliveryFee" | "gstAmount">
): number {
  return buyerTotalCents(o).cents;
}

/** Ex-GST gross revenue: buyer total less GST collected on the line (product + delivery ex GST, as stored). */
export function orderRevenueBeforeTaxCents(
  o: Pick<Order, "totalChargedCents" | "grossAmount" | "deliveryFee" | "gstAmount">
): number {
  return buyerTotalCents(o).cents - gstCents(o);
}

export function sellerCommercialNetCents(o: Pick<Order, "netAmount">): number {
  return Math.round(o.netAmount * 100);
}

export function buildPaymentIntentShareMap(orders: Pick<Order, "stripePaymentId">[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of orders) {
    if (!o.stripePaymentId) continue;
    m.set(o.stripePaymentId, (m.get(o.stripePaymentId) ?? 0) + 1);
  }
  return m;
}

export function orderProductLine(o: OrderWithRelations): string {
  if (o.listing) return o.listing.productName;
  if (o.wantedOffer?.wantedItem) return `[Wanted] ${o.wantedOffer.wantedItem.productName}`;
  return "";
}

export function orderKind(o: OrderWithRelations): string {
  if (o.wantedOfferId) return "WANTED_OFFER";
  if (o.listingId) return "LISTING";
  return "UNKNOWN";
}

export function buildAccountingOrderRows(orders: OrderWithRelations[]): {
  rows: AccountingOrderRow[];
  summary: AccountingSummary;
  refundRows: Record<string, string | number>[];
} {
  const piShares = buildPaymentIntentShareMap(orders);
  const sorted = [...orders].sort((a, b) => {
    const pa = a.stripePaymentId ?? "";
    const pb = b.stripePaymentId ?? "";
    if (pa !== pb) return pa.localeCompare(pb);
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  const piIndex = new Map<string, number>();
  const rows: AccountingOrderRow[] = [];
  const refundRows: Record<string, string | number>[] = [];

  let sumBuyer = 0;
  let sumRevBefore = 0;
  let sumPf = 0;
  let sumGst = 0;
  let sumNet = 0;
  let sumTransfer = 0;
  let sumRefunded = 0;
  let manual = 0;
  let stripe = 0;
  let legacy = 0;

  for (const o of sorted) {
    const { cents: buyerCents, basis } = buyerTotalCents(o);
    const pfC = platformFeeCents(o);
    const gstC = gstCents(o);
    const netC = sellerCommercialNetCents(o);
    const transferC = buyerCents - pfC;

    if (basis === "computed_float") legacy += 1;
    if (o.source === "MANUAL") manual += 1;
    else stripe += 1;

    sumBuyer += buyerCents;
    sumRevBefore += buyerCents - gstC;
    sumPf += pfC;
    sumGst += gstC;
    sumNet += netC;
    sumTransfer += transferC;

    let lineInPi = 1;
    let shareCount = 1;
    if (o.stripePaymentId) {
      const idx = (piIndex.get(o.stripePaymentId) ?? 0) + 1;
      piIndex.set(o.stripePaymentId, idx);
      lineInPi = idx;
      shareCount = piShares.get(o.stripePaymentId) ?? 1;
    }

    const refundedCents = o.refunds.reduce((s, r) => s + r.amountCents, 0);
    sumRefunded += refundedCents;

    for (const r of o.refunds) {
      refundRows.push({
        refund_id: r.id,
        order_id: o.id,
        refund_date_utc: r.createdAt.toISOString(),
        amount_aud: roundMoneyFromFloat(r.amountCents / 100),
        amount_cents: r.amountCents,
        stripe_refund_id: r.stripeRefundId ?? "",
        reason: (r.reason ?? "").slice(0, 500),
      });
    }

    rows.push({
      order_id: o.id,
      order_date_utc: o.createdAt.toISOString(),
      status: o.status,
      source: o.source,
      charge_model: o.chargeModel ?? "destination",
      order_kind: orderKind(o),
      buyer_name: o.buyer.name,
      buyer_abn: o.buyer.abn,
      seller_name: o.seller.name,
      seller_abn: o.seller.abn,
      product_line: orderProductLine(o),
      quantity: o.quantity,
      unit_price_ex_gst: roundMoneyFromFloat(o.unitPrice),
      product_gross_ex_gst: roundMoneyFromFloat(o.grossAmount),
      delivery_ex_gst: roundMoneyFromFloat(o.deliveryFee ?? 0),
      gst_collected_aud: roundMoneyFromFloat(o.gstAmount),
      gst_collected_cents: gstC,
      order_revenue_before_tax_aud: roundMoneyFromFloat((buyerCents - gstC) / 100),
      order_revenue_before_tax_cents: buyerCents - gstC,
      order_revenue_after_tax_aud: roundMoneyFromFloat(buyerCents / 100),
      order_revenue_after_tax_cents: buyerCents,
      buyer_total_aud: roundMoneyFromFloat(buyerCents / 100),
      buyer_total_cents: buyerCents,
      buyer_total_basis: basis,
      platform_fee_aud: roundMoneyFromFloat(pfC / 100),
      platform_fee_cents: pfC,
      seller_commercial_net_aud: roundMoneyFromFloat(o.netAmount),
      seller_commercial_net_cents: netC,
      stripe_transfer_after_fee_aud: roundMoneyFromFloat(transferC / 100),
      stripe_transfer_after_fee_cents: transferC,
      stripe_payment_intent_id: o.stripePaymentId ?? "",
      shared_payment_intent: o.stripePaymentId && shareCount > 1 ? "Yes" : "No",
      line_index_in_payment: o.stripePaymentId ? `${lineInPi} of ${shareCount}` : "",
      refunded_total_aud: roundMoneyFromFloat(refundedCents / 100),
      refunded_total_cents: refundedCents,
      disputed: o.disputedAt ? "Yes" : "No",
      stripe_dispute_id: o.stripeDisputeId ?? "",
      fulfillment_type: o.fulfillmentType,
    });
  }

  const summary: AccountingSummary = {
    orderCount: orders.length,
    sumBuyerTotalCents: sumBuyer,
    sumRevenueAfterTaxCents: sumBuyer,
    sumRevenueBeforeTaxCents: sumRevBefore,
    sumPlatformFeeCents: sumPf,
    sumGstCents: sumGst,
    sumSellerCommercialNetCents: sumNet,
    sumTransferToSellerCents: sumTransfer,
    sumRefundedCents: sumRefunded,
    stripeOrderCount: stripe,
    manualOrderCount: manual,
    legacyAmountCount: legacy,
  };

  return { rows, summary, refundRows };
}

export function summaryToSheetRows(s: AccountingSummary, from?: string, to?: string): Record<string, string | number>[] {
  return [
    { field: "Report period from (UTC date)", value: from ?? "(all time)" },
    { field: "Report period to (UTC date)", value: to ?? "(all time)" },
    { field: "Order line count", value: s.orderCount },
    { field: "Stripe-sourced orders", value: s.stripeOrderCount },
    { field: "Manual orders", value: s.manualOrderCount },
    { field: "Orders using legacy amount (no totalChargedCents)", value: s.legacyAmountCount },
    { field: "Sum buyer total (AUD)", value: roundMoneyFromFloat(s.sumBuyerTotalCents / 100) },
    { field: "Sum buyer total (cents)", value: s.sumBuyerTotalCents },
    {
      field: "Sum order revenue before tax / ex GST (AUD)",
      value: roundMoneyFromFloat(s.sumRevenueBeforeTaxCents / 100),
    },
    { field: "Sum order revenue before tax (cents)", value: s.sumRevenueBeforeTaxCents },
    {
      field: "Sum order revenue after tax / GST incl. (AUD)",
      value: roundMoneyFromFloat(s.sumRevenueAfterTaxCents / 100),
    },
    { field: "Sum order revenue after tax (cents)", value: s.sumRevenueAfterTaxCents },
    { field: "Sum platform fee (AUD)", value: roundMoneyFromFloat(s.sumPlatformFeeCents / 100) },
    { field: "Sum platform fee (cents)", value: s.sumPlatformFeeCents },
    { field: "Sum GST on orders (AUD, informational)", value: roundMoneyFromFloat(s.sumGstCents / 100) },
    { field: "Sum GST (cents)", value: s.sumGstCents },
    { field: "Sum seller commercial net (AUD, gross - fee + delivery)", value: roundMoneyFromFloat(s.sumSellerCommercialNetCents / 100) },
    { field: "Sum Stripe transfer after platform fee (AUD)", value: roundMoneyFromFloat(s.sumTransferToSellerCents / 100) },
    { field: "Sum Stripe transfer (cents)", value: s.sumTransferToSellerCents },
    { field: "Sum refunds (AUD)", value: roundMoneyFromFloat(s.sumRefundedCents / 100) },
    { field: "Sum refunds (cents)", value: s.sumRefundedCents },
    {
      field: "Note",
      value:
        "Platform fee is 3.5% of product ex GST (min $1.50), not on delivery/GST. buyer_total = product+delivery+GST for the line. stripe_transfer_after_fee = buyer_total - platform_fee (destination charges). Use cents columns for reconciliation. Stripe card processing is separate in Stripe reports.",
    },
  ];
}
