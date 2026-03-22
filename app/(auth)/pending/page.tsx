import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PendingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  // Must match dashboard layout: only verified users may use the marketplace shell.
  // Do NOT use `!== false` — that treats `undefined` as verified and causes a redirect
  // loop with the dashboard (`isVerified !== true` → /pending).
  const isVerified = (session.user as { isVerified?: boolean }).isVerified === true;
  if (isVerified) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A] p-4">
      <div className="w-full max-w-md bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-heading font-bold text-gold">Verification in progress</h1>
        <p className="mt-4 text-white/90">
          Your pharmacy is being verified. We&apos;ll email you within 24 hours.
        </p>
        <p className="mt-2 text-sm text-white/60">
          Questions?{" "}
          <a href="mailto:galaxrx.team@gmail.com" className="text-gold hover:underline">
            galaxrx.team@gmail.com
          </a>
        </p>
        <form action="/api/auth/signout" method="POST" className="mt-8">
          <button type="submit" className="text-white/60 hover:text-white underline text-sm">
            Sign out
          </button>
        </form>
        <Link href="/" className="mt-4 block text-sm text-gold hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
