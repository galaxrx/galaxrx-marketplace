import Link from "next/link";

/**
 * Shown when My Account data queries fail (e.g. DB timeout) so the user gets a page instead of a generic RSC error.
 */
export default function AccountLoadFailed() {
  return (
    <div className="max-w-lg space-y-4 rounded-xl border border-[rgba(161,130,65,0.25)] bg-mid-navy p-6">
      <h1 className="text-2xl font-heading font-bold text-gold">My Account</h1>
      <p className="text-white/85 leading-relaxed">
        We couldn&apos;t load your account summary right now. This is usually a short-lived database or network issue on
        the server. Please try again in a minute.
      </p>
      <p className="text-xs text-white/45 leading-relaxed border-t border-white/10 pt-3">
        Operator note: frequent failures often mean the DB pool is exhausted on Vercel — use Supabase{" "}
        <span className="text-white/60">Transaction</span> pool (port 6543) and{" "}
        <code className="text-gold/80">pgbouncer=true&amp;connection_limit=10&amp;pool_timeout=30</code> in{" "}
        <code className="text-gold/80">DATABASE_URL</code>. See repo <code className="text-gold/80">docs/VERCEL-DEPLOY.md</code>.
      </p>
      <ul className="list-disc pl-5 text-sm text-white/70 space-y-1">
        <li>Wait a minute and use <strong className="text-white">Refresh</strong>.</li>
        <li>
          Your orders and profile may still load from{" "}
          <Link href="/orders" className="text-gold hover:underline">
            My Orders
          </Link>{" "}
          and{" "}
          <Link href="/settings" className="text-gold hover:underline">
            Settings
          </Link>
          .
        </li>
      </ul>
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-[#0D1B2A] hover:opacity-90"
        >
          Back to dashboard
        </Link>
        <Link href="/account" className="inline-flex items-center text-sm text-gold hover:underline">
          Try again →
        </Link>
      </div>
    </div>
  );
}
