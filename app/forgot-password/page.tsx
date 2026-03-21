"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Enter your email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Failed to send reset link");
        setLoading(false);
        return;
      }
      setSent(true);
      toast.success("If an account exists, we sent a reset link to your email.");
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A] p-4">
      <div className="w-full max-w-md bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl shadow-xl p-8 text-center">
        <h1 className="text-xl font-heading font-bold text-gold">Reset password</h1>
        <p className="mt-4 text-white/60 text-sm">
          Enter your email and we&apos;ll send a reset link.
        </p>
        {sent ? (
          <p className="mt-6 text-sm text-success">
            Check your inbox. If you don&apos;t see an email, check spam or try again.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="text-left">
              <label htmlFor="email" className="block text-sm font-medium mb-1 text-white/80">Email *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full max-w-md px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2.5 rounded-xl font-bold disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
        <Link href="/login" className="mt-6 block text-sm text-gold hover:underline">Back to sign in</Link>
      </div>
    </div>
  );
}
