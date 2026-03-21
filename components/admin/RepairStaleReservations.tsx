"use client";

import { useState } from "react";

export default function RepairStaleReservations() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    count?: number;
    stale?: { id: string; listingId: string; quantity: number }[];
    processed?: number;
    released?: number;
    errors?: { attemptId: string; error: string }[];
    error?: string;
  } | null>(null);

  async function handleCheck() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/repair-stale-reservations");
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.message || "Failed to load" });
        return;
      }
      setResult({ count: data.count, stale: data.stale });
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function handleRepair() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/repair-stale-reservations", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.message || "Repair failed" });
        return;
      }
      setResult({
        processed: data.processed,
        released: data.released,
        errors: data.errors,
      });
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4 max-w-lg">
      <h2 className="text-lg font-semibold text-gold mb-2">Repair stale reservations</h2>
      <p className="text-sm text-white/60 mb-3">
        Release stuck listing reservations (e.g. after expired checkouts) so quantity becomes available again.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50"
        >
          Check
        </button>
        <button
          type="button"
          onClick={handleRepair}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-gold/20 text-gold text-sm hover:bg-gold/30 disabled:opacity-50"
        >
          Run repair
        </button>
      </div>
      {result && (
        <div className="mt-3 text-sm text-white/80">
          {result.error && <p className="text-red-400">{result.error}</p>}
          {result.count !== undefined && (
            <p>Stale reservations: <strong>{result.count}</strong></p>
          )}
          {result.released !== undefined && (
            <p>Released: <strong>{result.released}</strong> of {result.processed} processed.</p>
          )}
          {result.errors && result.errors.length > 0 && (
            <p className="text-amber-400">Errors: {result.errors.length}</p>
          )}
        </div>
      )}
    </div>
  );
}
