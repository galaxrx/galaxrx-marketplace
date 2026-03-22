import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { PLATFORM } from "@/lib/platform";
import AccountPaymentMethods from "@/components/account/AccountPaymentMethods";
import SellerPayoutTimingNotice from "@/components/account/SellerPayoutTimingNotice";

export const dynamic = "force-dynamic";

function memberIdFromPharmacyId(id: string): string {
  return id.slice(-6).toUpperCase();
}

/** date-fns `format` throws on Invalid Date — avoid crashing the whole page. */
function safeFormatDate(value: unknown, fmt: string): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value as string);
  const t = d.getTime();
  if (!Number.isFinite(t)) return "—";
  try {
    return format(d, fmt);
  } catch {
    return "—";
  }
}

function formatMoney(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const pharmacyId = (session?.user as { id?: string })?.id;
  if (!pharmacyId) redirect("/login");

  const [pharmacy, sales, purchases] = await Promise.all([
    prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: {
        id: true,
        name: true,
        abn: true,
        address: true,
        suburb: true,
        state: true,
        postcode: true,
        phone: true,
        email: true,
        isVerified: true,
        stripeAccountId: true,
        createdAt: true,
      },
    }),
    prisma.order.findMany({
      where: { sellerId: pharmacyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        listing: { select: { productName: true } },
        buyer: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: { buyerId: pharmacyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        listing: { select: { productName: true } },
        seller: { select: { name: true } },
      },
    }),
  ]);

  const salesWithMeta = sales.map((order) => ({
    order,
    type: "sale" as const,
    counterparty: order.buyer?.name ?? "—",
  }));
  const purchasesWithMeta = purchases.map((order) => ({
    order,
    type: "purchase" as const,
    counterparty: order.seller?.name ?? "—",
  }));
  const allTransactions = [...salesWithMeta, ...purchasesWithMeta]
    .sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime())
    .slice(0, 200);

  if (!pharmacy) redirect("/login");

  const memberId = memberIdFromPharmacyId(pharmacy.id);
  const fullAddress = [pharmacy.address, pharmacy.suburb, pharmacy.state, pharmacy.postcode].filter(Boolean).join(", ");

  const totalTransactionValue = sales.reduce((s, o) => s + (Number(o.grossAmount) || 0), 0);
  const totalPlatformFee = sales.reduce((s, o) => s + (Number(o.platformFee) || 0), 0);
  const totalGstAmt = sales.reduce((s, o) => s + (Number(o.gstAmount) || 0), 0);
  const totalNetToSeller = sales.reduce((s, o) => s + (Number(o.netAmount) || 0), 0);
  const pendingPayoutsResult = await prisma.order.aggregate({
    where: {
      sellerId: pharmacyId,
      status: { in: ["PAID", "SHIPPED"] },
    },
    _sum: { netAmount: true },
  });
  const rawPending = pendingPayoutsResult._sum.netAmount;
  const amountDueToYou = Number(rawPending);
  const amountDueDisplay = Number.isFinite(amountDueToYou) ? amountDueToYou : 0;

  return (
    <div className="space-y-8 w-full max-w-none">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-gold">My Account</h1>
        <Link
          href="/settings"
          className="text-sm text-gold hover:underline"
        >
          Edit profile →
        </Link>
      </div>

      {/* Account details */}
      <section className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6">
        <h2 className="font-heading font-semibold text-lg text-white mb-4">Account details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-white/60">Account name</dt>
            <dd className="font-medium text-white">{pharmacy.name}</dd>
          </div>
          <div>
            <dt className="text-white/60">Member ID</dt>
            <dd className="font-medium text-white font-mono">GX-{memberId}</dd>
            <dd className="text-xs text-white/50 mt-0.5">Quote this when paying by EFT</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-white/60">Address</dt>
            <dd className="font-medium text-white">{fullAddress}</dd>
          </div>
          <div>
            <dt className="text-white/60">ABN</dt>
            <dd className="font-medium text-white">{pharmacy.abn}</dd>
          </div>
          <div>
            <dt className="text-white/60">Account status</dt>
            <dd className="font-medium">
              {pharmacy.isVerified ? (
                <span className="text-success">Verified · Active</span>
              ) : (
                <span className="text-warning">Pending verification</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-white/60">Payment terms</dt>
            <dd className="font-medium text-white">{PLATFORM.paymentTermsDays} days</dd>
          </div>
        </dl>
      </section>

      {/* Transaction history — all sales and purchases */}
      <section className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-heading font-semibold text-lg text-white">Transaction history</h2>
          <Link href="/orders" className="text-sm text-gold hover:underline">
            View orders →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left">
                <th className="px-4 py-3 text-white/70 font-medium">Date</th>
                <th className="px-4 py-3 text-white/70 font-medium">Type</th>
                <th className="px-4 py-3 text-white/70 font-medium">Tx ID</th>
                <th className="px-4 py-3 text-white/70 font-medium">Item name</th>
                <th className="px-4 py-3 text-white/70 font-medium">Counterparty</th>
                <th className="px-4 py-3 text-white/70 font-medium text-right">Amount</th>
                <th className="px-4 py-3 text-white/70 font-medium">Status</th>
                <th className="px-4 py-3 text-white/70 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/50">
                    No transactions yet. Your purchases and sales will appear here.
                  </td>
                </tr>
              ) : (
                allTransactions.map(({ order, type, counterparty }) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white/80 whitespace-nowrap">
                      {safeFormatDate(order.createdAt, "d MMM yyyy, HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          type === "sale"
                            ? "text-success bg-success/15 px-2 py-0.5 rounded text-xs font-medium"
                            : "text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded text-xs font-medium"
                        }
                      >
                        {type === "sale" ? "Sale" : "Purchase"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/90 font-mono text-xs">GX-{order.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-white/90">{order.listing?.productName ?? "—"}</td>
                    <td className="px-4 py-3 text-white/70">{counterparty}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {type === "sale" ? "+" : "-"}${formatMoney(order.grossAmount)}
                    </td>
                    <td className="px-4 py-3 text-white/70">{order.status}</td>
                    <td className="px-4 py-3">
                      <Link href="/orders" className="text-gold text-xs hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {allTransactions.length > 0 && (
          <div className="p-3 bg-white/5 border-t border-white/10 text-center text-white/50 text-xs">
            Showing latest {allTransactions.length} transactions · Full details in My Orders
          </div>
        )}
      </section>

      {/* Sales & transaction summary */}
      <section className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/10 space-y-4">
          <SellerPayoutTimingNotice />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-heading font-semibold text-lg text-white">Sales & fees</h2>
            {amountDueDisplay > 0 && (
              <div className="bg-success/15 border border-success/40 rounded-lg px-4 py-2">
                <span className="text-white/70 text-sm">Amount due to you (pending payout)</span>
                <p className="text-xl font-bold text-success">${amountDueDisplay.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-left">
                <th className="px-4 py-3 text-white/70 font-medium">Tx ID</th>
                <th className="px-4 py-3 text-white/70 font-medium">Date</th>
                <th className="px-4 py-3 text-white/70 font-medium">Item name</th>
                <th className="px-4 py-3 text-white/70 font-medium text-right">Transaction value</th>
                <th className="px-4 py-3 text-white/70 font-medium text-right">Platform fee ({PLATFORM.platformFeePercent}%)</th>
                <th className="px-4 py-3 text-white/70 font-medium text-right">GST (10%)</th>
                <th className="px-4 py-3 text-white/70 font-medium text-right">Net to you</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                    No sales yet. When you sell items, they will appear here.
                  </td>
                </tr>
              ) : (
                sales.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white/90 font-mono text-xs">GX-{o.id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-white/80">{safeFormatDate(o.createdAt, "d MMM yyyy")}</td>
                    <td className="px-4 py-3 text-white/90">{o.listing?.productName ?? "—"}</td>
                    <td className="px-4 py-3 text-white/90 text-right">${formatMoney(o.grossAmount)}</td>
                    <td className="px-4 py-3 text-white/70 text-right">${formatMoney(o.platformFee)}</td>
                    <td className="px-4 py-3 text-white/70 text-right">${formatMoney(o.gstAmount)}</td>
                    <td className="px-4 py-3 text-gold font-medium text-right">${formatMoney(o.netAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sales.length > 0 && (
          <div className="p-4 bg-white/5 border-t border-white/10 flex flex-wrap gap-6 justify-end text-sm">
            <span className="text-white/70">Total transaction value: <strong className="text-white">${formatMoney(totalTransactionValue)}</strong></span>
            <span className="text-white/70">Total platform fee: <strong className="text-white">${formatMoney(totalPlatformFee)}</strong></span>
            <span className="text-white/70">Total GST: <strong className="text-white">${formatMoney(totalGstAmt)}</strong></span>
            <span className="text-gold font-semibold">Total net to you: ${formatMoney(totalNetToSeller)}</span>
          </div>
        )}
      </section>

      {/* Platform contact (compact) */}
      <section className="bg-mid-navy/60 border border-[rgba(161,130,65,0.12)] rounded-xl p-4">
        <h3 className="font-semibold text-white/80 text-sm mb-2">Platform contact</h3>
        <p className="text-white/60 text-sm">
          {PLATFORM.legalName}
          {PLATFORM.address && ` · ${PLATFORM.address}`}
          {PLATFORM.email && ` · ${PLATFORM.email}`}
          {PLATFORM.website && ` · ${PLATFORM.website}`}
        </p>
      </section>

      {/* Payment methods */}
      <AccountPaymentMethods
        memberId={`GX-${memberId}`}
        hasStripeConnected={!!pharmacy.stripeAccountId}
        platformName={PLATFORM.name}
        eft={PLATFORM.eft}
      />
    </div>
  );
}
