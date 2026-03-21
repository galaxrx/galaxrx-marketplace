import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as XLSX from "xlsx";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildAccountingOrderRows,
  summaryToSheetRows,
  type OrderWithRelations,
} from "@/lib/admin-accounting-export";

export const dynamic = "force-dynamic";

function parseUtcRange(from: string | null, to: string | null): { gte?: Date; lte?: Date } {
  let gte: Date | undefined;
  let lte: Date | undefined;
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    gte = new Date(`${from}T00:00:00.000Z`);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    lte = new Date(`${to}T23:59:59.999Z`);
  }
  return { gte, lte };
}

const DEFINITION_ROWS = [
  {
    column: "order_revenue_after_tax_*",
    meaning: "GST-inclusive gross for the line — same as buyer total charged (product + delivery + GST as stored).",
  },
  {
    column: "order_revenue_before_tax_*",
    meaning: "Ex-GST gross: buyer total minus GST on the line (matches product_gross_ex_gst + delivery_ex_gst when floats align).",
  },
  { column: "buyer_total_cents / buyer_total_aud", meaning: "What the buyer paid for this order line. Prefer Order.totalChargedCents; else computed from gross+delivery+GST." },
  { column: "platform_fee_cents / platform_fee_aud", meaning: "GalaxRX marketplace fee (3.5% of product ex GST, min $1.50). Stripe application_fee_amount." },
  { column: "gst_collected_*", meaning: "GST amount stored on the order line (10% on subtotal ex GST for taxable; 0 if GST-free)." },
  { column: "seller_commercial_net_*", meaning: "grossAmount - platformFee + deliveryFee (ex-GST commercial net to seller before GST passthrough in transfer)." },
  { column: "stripe_transfer_after_fee_*", meaning: "buyer_total - platform_fee for this line (destination charge: amount routed to connected account before Stripe processing fees)." },
  { column: "shared_payment_intent", meaning: "Yes if multiple order lines share one Stripe PaymentIntent (same-seller cart)." },
  { column: "buyer_total_basis", meaning: "totalChargedCents = authoritative from checkout; computed_float = legacy orders — verify against Stripe if needed." },
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const { gte, lte } = parseUtcRange(from, to);

  const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (gte || lte) {
    where.createdAt = {};
    if (gte) where.createdAt.gte = gte;
    if (lte) where.createdAt.lte = lte;
  }

  const orders = (await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      buyer: { select: { name: true, abn: true } },
      seller: { select: { name: true, abn: true } },
      listing: { select: { productName: true } },
      wantedOffer: { include: { wantedItem: { select: { productName: true } } } },
      refunds: true,
    },
  })) as OrderWithRelations[];

  const { rows, summary, refundRows } = buildAccountingOrderRows(orders);
  const summaryRows = summaryToSheetRows(summary, from ?? undefined, to ?? undefined);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Order lines");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(DEFINITION_ROWS), "Column definitions");
  if (refundRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(refundRows), "Refunds");
  } else {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([{ note: "No refunds in this period." }]),
      "Refunds"
    );
  }

  const filename = `galaxrx-accounting-${from ?? "start"}-${to ?? "end"}.xlsx`;
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
