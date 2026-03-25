"use client";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError(
        res.error === "CredentialsSignin"
          ? "Invalid email or password."
          : `Sign in failed (${res.error}).`
      );
      return;
    }
    if (res?.ok && res.url) {
      try {
        const url = new URL(res.url);
        const target = url.pathname + url.search;
        window.location.replace(target);
      } catch {
        window.location.replace(callbackUrl);
      }
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0D1B2A] p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 text-sm text-white/55 hover:text-gold transition-colors inline-flex items-center gap-1.5"
        aria-label="Back to home"
      >
        <span aria-hidden className="text-lg leading-none">
          ←
        </span>
        Back to home
      </Link>
      <div className="w-full max-w-md bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl shadow-xl p-8">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-heading font-bold text-gold">
            GalaxRX
          </Link>
          <p className="mt-2 text-white/60 text-sm">Sign in to your pharmacy account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-error/10 text-error text-sm p-3 rounded-md">{error}</div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full max-w-md px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50"
              placeholder="you@pharmacy.com.au"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full max-w-md px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50"
            />
          </div>
          <div className="text-right">
            <Link href="/forgot-password" className="text-sm text-gold hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2.5 rounded-xl font-bold hover:shadow-gold/30 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-white/60">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-gold font-medium hover:underline">
            Join free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]"><p className="text-white/60">Loading…</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
