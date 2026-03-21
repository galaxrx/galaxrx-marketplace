import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EmailConfigCheck from "@/components/admin/EmailConfigCheck";
import RepairStaleReservations from "@/components/admin/RepairStaleReservations";
import { audFromCents, rollupFinancialKpis } from "@/lib/admin-kpis";

export const dynamic = "force-dynamic";

function KpiCard({
  label,
  value,
  hint,
  valueClassName = "text-gold",
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4 flex flex-col min-h-[100px]">
      <p className="text-sm text-white/60">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valueClassName}`}>{value}</p>
      {hint ? <p className="text-xs text-white/45 mt-auto pt-2 leading-snug">{hint}</p> : null}
    </div>
  );
}

export default async function AdminPage() {
  const [
    ordersForFinance,
    refundAgg,
    refundCount,
    orderStatusGroups,
    pharmacyVerified,
    pharmacyPending,
    listingTotal,
    listingActive,
    wantedActive,
    offersPending,
    negotiationsPending,
    openDisputes,
    soldUnitsAgg,
  ] = await Promise.all([
    prisma.order.findMany({
      select: {
        totalChargedCents: true,
        grossAmount: true,
        deliveryFee: true,
        gstAmount: true,
        platformFee: true,
        netAmount: true,
      },
    }),
    prisma.refund.aggregate({ _sum: { amountCents: true } }),
    prisma.refund.count(),
    prisma.order.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.pharmacy.count({ where: { isVerified: true } }),
    prisma.pharmacy.count({ where: { isVerified: false } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { isActive: true } }),
    prisma.wantedItem.count({ where: { isActive: true } }),
    prisma.wantedOffer.count({ where: { status: "PENDING" } }),
    prisma.listingNegotiation.count({ where: { status: "PENDING" } }),
    prisma.order.count({
      where: { disputedAt: { not: null }, disputeClosedAt: null },
    }),
    prisma.order.aggregate({
      _sum: { quantity: true },
      where: {
        status: { notIn: ["PENDING", "CANCELLED"] },
      },
    }),
  ]);

  const fin = rollupFinancialKpis(ordersForFinance);
  const soldUnitsTotal = soldUnitsAgg._sum.quantity ?? 0;
  const refundCents = refundAgg._sum.amountCents ?? 0;
  const aovCents =
    fin.orderLineCount > 0 ? Math.round(fin.sumBuyerPaidCents / fin.orderLineCount) : 0;
  const takeRatePct =
    fin.sumBuyerPaidCents > 0
      ? ((fin.sumPlatformFeeCents / fin.sumBuyerPaidCents) * 100).toFixed(1)
      : "—";

  const statusOrder: Record<string, number> = {
    PENDING: 0,
    PAID: 1,
    SHIPPED: 2,
    DELIVERED: 3,
    DISPUTED: 4,
    DISPUTE_LOST: 5,
    CANCELLED: 6,
    REFUNDED: 7,
    REFUNDED_PARTIAL: 8,
    REFUNDED_FULL: 9,
  };
  const statusRows = [...orderStatusGroups].sort(
    (a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  );

  return (
    <div className="space-y-10 max-w-6xl">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gold mb-1">Admin</h1>
        <p className="text-sm text-white/60">
          Financial figures use the same cent logic as{" "}
          <Link href="/admin/accountant" className="text-gold hover:underline">
            Accountant
          </Link>{" "}
          (authoritative <code className="text-white/70">totalChargedCents</code> per line where present).
        </p>
      </div>

      <section>
        <h2 className="text-lg font-heading font-semibold text-white mb-3">Financial KPIs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Buyer-paid volume (GST incl.)"
            value={`$${audFromCents(fin.sumBuyerPaidCents)}`}
            hint="Sum charged to buyers per order line."
          />
          <KpiCard
            label="Order revenue before tax (ex GST)"
            value={`$${audFromCents(fin.sumRevenueExGstCents)}`}
            hint="Buyer total less GST component on each line."
          />
          <KpiCard
            label="GST on orders (collected)"
            value={`$${audFromCents(fin.sumGstCents)}`}
            hint="As stored on order lines; not platform remittance advice."
          />
          <KpiCard
            label="Platform fees (total)"
            value={`$${audFromCents(fin.sumPlatformFeeCents)}`}
            hint="Application fees per line (min $1.50 where applicable)."
          />
          <KpiCard
            label="Product GMV (ex GST)"
            value={`$${audFromCents(fin.sumProductExGstCents)}`}
            hint="Sum of line grossAmount (product only, ex GST)."
          />
          <KpiCard
            label="Seller commercial net (total)"
            value={`$${audFromCents(fin.sumSellerNetCents)}`}
            valueClassName={fin.sumSellerNetCents < 0 ? "text-amber-300" : "text-success/90"}
            hint="Stored net to seller per line (ex-GST product − fee + delivery)."
          />
          <KpiCard
            label="Transfer after platform fee"
            value={`$${audFromCents(fin.sumTransferAfterFeeCents)}`}
            valueClassName={fin.sumTransferAfterFeeCents < 0 ? "text-amber-300" : "text-white"}
            hint="Per line: buyer total − platform fee (destination charge basis)."
          />
          <KpiCard
            label="Refunds"
            value={`${refundCount} · $${audFromCents(refundCents)}`}
            hint="All-time refund rows and amounts."
          />
          <KpiCard
            label="Avg order line (buyer-paid)"
            value={fin.orderLineCount > 0 ? `$${audFromCents(aovCents)}` : "—"}
            hint="Mean buyer total per order line."
          />
          <KpiCard label="Platform fee / buyer-paid" value={`${takeRatePct}%`} hint="Aggregate ratio (not margin)." />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-heading font-semibold text-white mb-3">Operational KPIs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Order lines (all time)" value={String(fin.orderLineCount)} />
          <KpiCard
            label="Units sold (platform)"
            value={String(soldUnitsTotal)}
            hint="Sum of order quantities for non-cancelled, non-pending lines (includes refunded & disputed)."
          />
          <KpiCard
            label="Pharmacies (verified / pending)"
            value={`${pharmacyVerified} / ${pharmacyPending}`}
          />
          <KpiCard
            label="Listings (active / total)"
            value={`${listingActive} / ${listingTotal}`}
          />
          <KpiCard label="Active wanted posts" value={String(wantedActive)} />
          <KpiCard label="Pending wanted offers" value={String(offersPending)} />
          <KpiCard label="Pending listing negotiations" value={String(negotiationsPending)} />
          <KpiCard
            label="Open Stripe disputes"
            value={String(openDisputes)}
            valueClassName={openDisputes > 0 ? "text-amber-300" : "text-gold"}
            hint="Orders with disputedAt set and not yet closed."
          />
          <KpiCard
            label="Legacy amount lines"
            value={String(fin.legacyAmountLineCount)}
            hint="Orders without totalChargedCents (float recompute)."
          />
        </div>

        <div className="mt-4 rounded-xl border border-[rgba(161,130,65,0.15)] bg-mid-navy/80 p-4">
          <p className="text-xs text-white/50 uppercase tracking-wide mb-2">Orders by status</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {statusRows.length === 0 ? (
              <span className="text-white/45">No orders yet.</span>
            ) : (
              statusRows.map((row) => (
                <span key={row.status} className="text-white/85">
                  <span className="text-white/55">{row.status}:</span>{" "}
                  <span className="font-mono text-gold">{row._count}</span>
                </span>
              ))
            )}
          </div>
          <p className="mt-3 text-sm">
            <Link href="/admin/transactions" className="text-gold hover:underline">
              View transactions →
            </Link>
          </p>
        </div>
      </section>

      <EmailConfigCheck />
      <RepairStaleReservations />
    </div>
  );
}
