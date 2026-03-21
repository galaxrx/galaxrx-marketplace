"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const URGENCY_OPTS = [
  { value: "", label: "All urgency" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
];
const SORT_OPTS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "urgency", label: "Most urgent" },
  { value: "quantity", label: "Highest qty" },
];
const STATES = ["", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export default function WantedFilters({ basePath = "/wanted/browse" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, val: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (val) next.set(key, val);
      else next.delete(key);
      next.delete("page");
      router.push(`${basePath}?${next.toString()}`);
    },
    [router, searchParams, basePath]
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select
        value={searchParams.get("urgency") ?? ""}
        onChange={(e) => update("urgency", e.target.value)}
        className="px-3 py-2 bg-white/5 border border-[rgba(161,130,65,0.3)] rounded-lg text-white text-sm focus:ring-2 focus:ring-gold [&>option]:bg-[#0D1B2A]"
        aria-label="Filter by urgency"
      >
        {URGENCY_OPTS.map((o) => (
          <option key={o.value || "all"} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={searchParams.get("state") ?? ""}
        onChange={(e) => update("state", e.target.value)}
        className="px-3 py-2 bg-white/5 border border-[rgba(161,130,65,0.3)] rounded-lg text-white text-sm focus:ring-2 focus:ring-gold [&>option]:bg-[#0D1B2A]"
        aria-label="Filter by state"
      >
        <option value="">All states</option>
        {STATES.filter(Boolean).map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        value={searchParams.get("sort") ?? "newest"}
        onChange={(e) => update("sort", e.target.value)}
        className="px-3 py-2 bg-white/5 border border-[rgba(161,130,65,0.3)] rounded-lg text-white text-sm focus:ring-2 focus:ring-gold [&>option]:bg-[#0D1B2A]"
        aria-label="Sort by"
      >
        {SORT_OPTS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
