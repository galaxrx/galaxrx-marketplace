/**
 * Admin dashboard rollups — same cent logic as Accountant / transactions.
 */

import type { Order } from "@prisma/client";
import {
  buyerTotalCents,
  gstCents,
  platformFeeCents,
  sellerCommercialNetCents,
} from "@/lib/admin-accounting-export";

export type FinancialRollup = {
  orderLineCount: number;
  sumBuyerPaidCents: number;
  sumRevenueExGstCents: number;
  sumGstCents: number;
  sumPlatformFeeCents: number;
  sumSellerNetCents: number;
  sumTransferAfterFeeCents: number;
  sumProductExGstCents: number;
  sumDeliveryExGstCents: number;
  legacyAmountLineCount: number;
};

type OrderRollupFields = Pick<
  Order,
  | "totalChargedCents"
  | "grossAmount"
  | "deliveryFee"
  | "gstAmount"
  | "platformFee"
  | "netAmount"
>;

export function rollupFinancialKpis(orders: OrderRollupFields[]): FinancialRollup {
  let sumBuyerCents = 0;
  let sumGstCents = 0;
  let sumPlatformCents = 0;
  let sumNetCents = 0;
  let sumTransferCents = 0;
  let sumRevExCents = 0;
  let sumProductExCents = 0;
  let sumDeliveryExCents = 0;
  let legacyRows = 0;

  for (const o of orders) {
    const { cents: b, basis } = buyerTotalCents(o);
    const p = platformFeeCents(o);
    const g = gstCents(o);
    sumBuyerCents += b;
    sumGstCents += g;
    sumPlatformCents += p;
    sumNetCents += sellerCommercialNetCents(o);
    sumTransferCents += b - p;
    sumRevExCents += b - g;
    sumProductExCents += Math.round(o.grossAmount * 100);
    sumDeliveryExCents += Math.round((o.deliveryFee ?? 0) * 100);
    if (basis === "computed_float") legacyRows += 1;
  }

  return {
    orderLineCount: orders.length,
    sumBuyerPaidCents: sumBuyerCents,
    sumRevenueExGstCents: sumRevExCents,
    sumGstCents,
    sumPlatformFeeCents: sumPlatformCents,
    sumSellerNetCents: sumNetCents,
    sumTransferAfterFeeCents: sumTransferCents,
    sumProductExGstCents: sumProductExCents,
    sumDeliveryExGstCents: sumDeliveryExCents,
    legacyAmountLineCount: legacyRows,
  };
}

export function audFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
