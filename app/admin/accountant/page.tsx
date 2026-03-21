import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AccountantExportPanel from "@/components/admin/AccountantExportPanel";
import {
  buyerTotalCents,
  platformFeeCents,
  gstCents,
  sellerCommercialNetCents,
} from "@/lib/admin-accounting-export";

export const dynamic = "force-dynamic";

function aud(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default async function AccountantPage() {
  const [orderCount, refundAgg, refundCount, orders] = await Promise.all([
    prisma.order.count(),
    prisma.refund.aggregate({ _sum: { amountCents: true } }),
    prisma.refund.count(),
    prisma.order.findMany({
      select: {
        totalChargedCents: true,
        grossAmount: true,
        deliveryFee: true,
        gstAmount: true,
        platformFee: true,
        netAmount: true,
        source: true,
      },
    }),
  ]);

  let sumBuyerCents = 0;
  let sumPlatformCents = 0;
  let sumGstCents = 0;
  let sumNetCents = 0;
  let sumTransferCents = 0;
  let legacyRows = 0;
  let stripeRows = 0;
  let manualRows = 0;

  for (const o of orders) {
    const { cents: b, basis } = buyerTotalCents(o);
    const p = platformFeeCents(o);
    sumBuyerCents += b;
    sumPlatformCents += p;
    sumGstCents += gstCents(o);
    sumNetCents += sellerCommercialNetCents(o);
    sumTransferCents += b - p;
    if (basis === "computed_float") legacyRows += 1;
    if (o.source === "MANUAL") manualRows += 1;
    else stripeRows += 1;
  }

  const refundCents = refundAgg._sum.amountCents ?? 0;
  const dataIntegrityIssue = sumPlatformCents > sumBuyerCents || sumNetCents < 0 || sumTransferCents < 0;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gold mb-2">Accountant</h1>
        <p className="text-white/70 text-sm">
          Finance-oriented view of marketplace payments, GST lines, platform fees, and refunds. Totals below
          match the same logic as the Excel export (cent-accurate where <code className="text-gold/90">totalChargedCents</code>{" "}
          exists on each order).
        </p>
        <p className="text-sm mt-2">
          <Link href="/admin/transactions" className="text-gold hover:underline">
            View all transactions (filter by date &amp; pharmacy) →
          </Link>
        </p>
      </div>

      {dataIntegrityIssue ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100/95">
          <p className="font-semibold text-amber-200">Totals look inconsistent — this is usually historical test data</p>
          <p className="mt-2 text-white/80 leading-relaxed">
            If <strong className="text-white">sum platform fee</strong> is larger than{" "}
            <strong className="text-white">sum buyer paid</strong>, or seller net / transfer is negative, some order lines
            were created when checkout still allowed tiny totals with the <strong className="text-white">$1.50 minimum fee</strong>{" "}
            (fee larger than what the buyer paid). The dashboard is <strong className="text-white">correctly summing what is stored</strong>{" "}
            in the database — the underlying rows are economically invalid. New checkouts with that problem are blocked. Use{" "}
            <Link href="/admin/transactions" className="text-gold underline hover:opacity-90">
              Transactions
            </Link>{" "}
            and look for the <strong className="text-white">fee &gt; paid</strong> hint on lines.
          </p>
        </div>
      ) : null}

      <section className="rounded-xl border border-[rgba(161,130,65,0.18)] bg-mid-navy p-6 space-y-4">
        <h2 className="text-lg font-heading font-semibold text-white">All-time totals (live)</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Order lines</dt>
            <dd className="font-mono text-white">{orderCount}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Stripe-sourced / manual</dt>
            <dd className="font-mono text-white">
              {stripeRows} / {manualRows}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Lines without totalChargedCents (legacy)</dt>
            <dd className="font-mono text-amber-200">{legacyRows}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Sum buyer paid (AUD)</dt>
            <dd className="font-mono text-gold">${aud(sumBuyerCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Order revenue before tax (ex GST)</dt>
            <dd className="font-mono text-white/90">${aud(sumBuyerCents - sumGstCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Order revenue after tax (GST incl.)</dt>
            <dd className="font-mono text-gold/90">${aud(sumBuyerCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Sum platform fee (AUD)</dt>
            <dd className="font-mono text-gold">${aud(sumPlatformCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Sum GST on orders (AUD)</dt>
            <dd className="font-mono text-white/90">${aud(sumGstCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Sum seller commercial net (AUD)</dt>
            <dd className="font-mono text-success/90">${aud(sumNetCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Sum transfer after fee (AUD)</dt>
            <dd className="font-mono text-white">${aud(sumTransferCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-white/10 pb-2">
            <dt className="text-white/60">Refunds (count / AUD)</dt>
            <dd className="font-mono text-white">
              {refundCount} / ${aud(refundCents)}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-white/50 leading-relaxed">
          <strong className="text-white/70">Order revenue after tax</strong> is the GST-inclusive amount charged to the
          buyer for each line (same as <strong className="text-white/70">sum buyer paid</strong>).{" "}
          <strong className="text-white/70">Order revenue before tax</strong> is that total less the GST component stored
          on the order (ex-GST sale base: product + delivery ex GST). This is <strong className="text-white/70">not</strong>{" "}
          GalaxRX platform fee revenue — see platform fee row.{" "}
          <strong className="text-white/70">Transfer after fee</strong> = buyer total − platform fee per line (Stripe
          destination charges). Stripe’s card processing and settlement timing are in Stripe reports, not subtracted
          here. <strong className="text-white/70">GST</strong> is shown as collected on the order for bookkeeping;
          remittance obligations are a tax-adviser matter.
        </p>
      </section>

      <AccountantExportPanel />

      <section className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/75 space-y-3">
        <h2 className="text-lg font-heading font-semibold text-white">Workbook contents</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong className="text-white/90">Order lines</strong> — one row per order; buyer, seller, ABNs, product,
            amounts in AUD and cents, PaymentIntent id, refunds, disputes.
          </li>
          <li>
            <strong className="text-white/90">Summary</strong> — rolled-up totals for the selected period (or all time).
          </li>
          <li>
            <strong className="text-white/90">Column definitions</strong> — what each financial column means.
          </li>
          <li>
            <strong className="text-white/90">Refunds</strong> — one row per refund with Stripe refund id when present.
          </li>
        </ul>
      </section>
    </div>
  );
}
