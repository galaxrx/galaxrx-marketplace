import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buyerTotalCents, gstCents, platformFeeCents } from "@/lib/admin-accounting-export";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const MAX_ROWS = 500;

function parseDateParam(v: string | undefined): string | undefined {
  if (!v || typeof v !== "string") return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

function utcRange(from?: string, to?: string): { gte?: Date; lte?: Date } {
  const gte = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const lte = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
  return { gte, lte };
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminTransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const from = parseDateParam(
    typeof searchParams.from === "string" ? searchParams.from : undefined
  );
  const to = parseDateParam(typeof searchParams.to === "string" ? searchParams.to : undefined);
  const pharmacyId =
    typeof searchParams.pharmacyId === "string" && searchParams.pharmacyId.length > 0
      ? searchParams.pharmacyId
      : undefined;

  const { gte, lte } = utcRange(from, to);

  const where: Prisma.OrderWhereInput = {
    ...(gte || lte
      ? { createdAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } }
      : {}),
    ...(pharmacyId ? { OR: [{ buyerId: pharmacyId }, { sellerId: pharmacyId }] } : {}),
  };

  const [totalCount, orders, pharmacies] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
      include: {
        buyer: { select: { id: true, name: true, abn: true } },
        seller: { select: { id: true, name: true, abn: true } },
        listing: { select: { productName: true } },
      },
    }),
    prisma.pharmacy.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 w-full max-w-[1400px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gold mb-1">All transactions</h1>
          <p className="text-white/65 text-sm max-w-xl">
            Every order line (buy + sell). Filter by <strong className="text-white/85">date (UTC)</strong> and/or{" "}
            <strong className="text-white/85">pharmacy</strong> (matches if they are buyer or seller).
          </p>
        </div>
        <Link href="/admin/accountant" className="text-sm text-gold hover:underline shrink-0">
          Accountant &amp; Excel →
        </Link>
      </div>

      <form
        method="get"
        className="flex flex-wrap items-end gap-4 rounded-xl border border-[rgba(161,130,65,0.2)] bg-mid-navy p-4"
      >
        <div>
          <label className="block text-xs text-white/50 mb-1">From (UTC)</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">To (UTC)</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs text-white/50 mb-1">Pharmacy (optional)</label>
          <select
            name="pharmacyId"
            defaultValue={pharmacyId ?? ""}
            className="w-full max-w-md bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All pharmacies</option>
            {pharmacies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="bg-gold text-[#0D1B2A] px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
        >
          Apply filters
        </button>
        {(from || to || pharmacyId) && (
          <Link href="/admin/transactions" className="text-sm text-white/60 hover:text-white py-2">
            Clear
          </Link>
        )}
      </form>

      <p className="text-sm text-white/55">
        <strong className="text-white/75">{totalCount}</strong> order line(s) match.
        {totalCount > MAX_ROWS ? (
          <span className="text-amber-200/90">
            {" "}
            Showing newest <strong>{MAX_ROWS}</strong> only — narrow the date range if needed.
          </span>
        ) : null}
      </p>

      <div className="rounded-xl border border-[rgba(161,130,65,0.15)] overflow-hidden bg-mid-navy">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-white/65 text-xs uppercase tracking-wide">
                <th className="px-3 py-3 font-medium whitespace-nowrap">Date (UTC)</th>
                <th className="px-3 py-3 font-medium">Ref</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Buyer</th>
                <th className="px-3 py-3 font-medium">Seller</th>
                <th className="px-3 py-3 font-medium">Product</th>
                <th className="px-3 py-3 font-medium text-right whitespace-nowrap">Rev. before tax (ex GST)</th>
                <th className="px-3 py-3 font-medium text-right whitespace-nowrap">Rev. after tax (incl. GST)</th>
                <th className="px-3 py-3 font-medium text-right">Platform fee</th>
                <th className="px-3 py-3 font-medium text-right">GST</th>
                <th className="px-3 py-3 font-medium text-right">Seller net</th>
                <th className="px-3 py-3 font-medium whitespace-nowrap">Stripe PI</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-white/45">
                    No orders match these filters.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const { cents: buyerC } = buyerTotalCents(o);
                  const gstC = gstCents(o);
                  const revBeforeC = buyerC - gstC;
                  const pfC = platformFeeCents(o);
                  const feeWarn = pfC > buyerC;
                  return (
                    <tr key={o.id} className="border-b border-white/5 hover:bg-white/[0.04]">
                      <td className="px-3 py-2 text-white/80 whitespace-nowrap">
                        {format(o.createdAt, "yyyy-MM-dd HH:mm")}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gold/90">
                        GX-{o.id.slice(-5).toUpperCase()}
                      </td>
                      <td className="px-3 py-2 text-white/70">{o.status}</td>
                      <td className="px-3 py-2 text-white/85 max-w-[140px] truncate" title={o.buyer.name}>
                        {o.buyer.name}
                      </td>
                      <td className="px-3 py-2 text-white/85 max-w-[140px] truncate" title={o.seller.name}>
                        {o.seller.name}
                      </td>
                      <td className="px-3 py-2 text-white/70 max-w-[180px] truncate">
                        {o.listing?.productName ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-white/85">
                        ${(revBeforeC / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-white">
                        ${(buyerC / 100).toFixed(2)}
                        {feeWarn ? (
                          <span className="block text-[10px] text-amber-300/95 font-sans font-normal">
                            fee &gt; paid
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-white/90">${o.platformFee.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono text-white/70">${o.gstAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono text-success/85">${o.netAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-white/50 max-w-[120px] truncate">
                        {o.stripePaymentId ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
