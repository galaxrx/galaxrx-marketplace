"use client";

import { useMemo, useState } from "react";

export default function AccountantExportPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const exportHref = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const q = p.toString();
    return q ? `/api/admin/accounting-export?${q}` : "/api/admin/accounting-export";
  }, [from, to]);

  return (
    <div className="rounded-xl border border-[rgba(161,130,65,0.25)] bg-mid-navy p-6 space-y-4">
      <h2 className="text-lg font-heading font-semibold text-gold">Excel export</h2>
      <p className="text-sm text-white/70">
        Filter by <strong className="text-white/90">order date (UTC)</strong>. Leave blank to export all orders.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs text-white/50 mb-1">From (YYYY-MM-DD)</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1">To (YYYY-MM-DD)</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
        <a
          href={exportHref}
          className="inline-flex items-center justify-center bg-gold text-[#0D1B2A] px-5 py-2.5 rounded-lg text-sm font-bold hover:opacity-90"
        >
          Download .xlsx
        </a>
      </div>
    </div>
  );
}
