"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to reset password");
        setLoading(false);
        return;
      }
      toast.success("Password updated. Sign in with your new password.");
      router.push("/login");
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  const inputClass = "w-full max-w-md px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A] p-4">
      <div className="w-full max-w-md bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl shadow-xl p-8">
        <h1 className="text-xl font-heading font-bold text-gold text-center">
          Set new password
        </h1>
        <p className="mt-4 text-white/60 text-sm text-center">
          Enter your new password below.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1 text-white/80">New password *</label>
            <input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium mb-1 text-white/80">Confirm password *</label>
            <input id="confirm" type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} required />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2.5 rounded-xl font-bold disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
        <Link href="/login" className="mt-6 block text-sm text-gold hover:underline text-center">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
