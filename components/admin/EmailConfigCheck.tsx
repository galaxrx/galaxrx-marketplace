"use client";

import { useState } from "react";

export default function EmailConfigCheck() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    configured: boolean;
    message: string;
    fromEmail?: string;
  } | null>(null);

  async function check() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/check-email");
      const data = await res.json();
      if (res.ok) {
        setResult({
          configured: data.configured,
          message: data.message,
          fromEmail: data.fromEmail,
        });
      } else {
        setResult({ configured: false, message: data.message ?? "Request failed" });
      }
    } catch {
      setResult({ configured: false, message: "Network error" });
    }
    setLoading(false);
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-mid-navy border border-[rgba(161,130,65,0.18)] max-w-md">
      <p className="text-sm text-white/70 mb-2">Welcome emails (Resend)</p>
      <button
        type="button"
        onClick={check}
        disabled={loading}
        className="text-sm px-3 py-1.5 bg-gold/20 text-gold rounded hover:bg-gold/30 disabled:opacity-50"
      >
        {loading ? "Checking…" : "Check email config"}
      </button>
      {result && (
        <div className="mt-2 space-y-1">
          <p className={`text-sm ${result.configured ? "text-success" : "text-warning"}`}>
            {result.message}
          </p>
          {result.configured && result.fromEmail && (
            <p className="text-xs text-white/50">
              Sending from: {result.fromEmail}. If sends fail before the domain is verified in Resend, set{" "}
              <code className="text-xs bg-white/10 px-1 rounded">RESEND_FROM_EMAIL=GalaxRX &lt;onboarding@resend.dev&gt;</code> locally until DNS verification completes.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
