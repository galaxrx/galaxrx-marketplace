import Link from "next/link";

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A] p-4">
      <div className="w-full max-w-md bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl shadow-xl p-8 text-center">
        <h1 className="text-2xl font-heading font-bold text-gold">Thank you</h1>
        <p className="mt-4 text-white/90">
          Your application has been received. We verify accounts within 24 hours. You&apos;ll receive an email when approved.
        </p>
        <p className="mt-2 text-sm text-white/60">
          Questions?{" "}
          <a href="mailto:galaxrx.team@gmail.com" className="text-gold hover:underline">
            galaxrx.team@gmail.com
          </a>
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-6 py-2.5 rounded-xl font-bold hover:shadow-gold/30"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
