"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const SORT_OPTS = [
  { value: "newest", label: "Date (newest)" },
  { value: "oldest", label: "Date (oldest)" },
  { value: "nearest", label: "Nearest (distance)" },
  { value: "price", label: "Price low → high" },
  { value: "expiry", label: "Expiry soonest" },
  { value: "discount", label: "Biggest discount" },
];

export default function SortByBar({ basePath = "/buy" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") ?? "newest";
  const [locationLoading, setLocationLoading] = useState(false);

  const handleSortChange = useCallback(
    (value: string) => {
      if (value === "nearest") {
        if (!navigator.geolocation) {
          toast.error("Location is not supported by your browser.");
          return;
        }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("sort", "nearest");
            next.set("lat", String(pos.coords.latitude));
            next.set("lng", String(pos.coords.longitude));
            router.push(`${basePath}?${next.toString()}`);
            setLocationLoading(false);
          },
          () => {
            toast.error("Could not get your location. Allow location access to sort by nearest.");
            setLocationLoading(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
        return;
      }
      const next = new URLSearchParams(searchParams.toString());
      next.set("sort", value);
      next.delete("lat");
      next.delete("lng");
      router.push(`${basePath}?${next.toString()}`);
    },
    [basePath, router, searchParams]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-white/80">Sort by:</span>
      <select
        value={sort}
        onChange={(e) => handleSortChange(e.target.value)}
        disabled={locationLoading}
        className="px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.3)] rounded-lg text-white text-sm font-medium focus:ring-2 focus:ring-gold focus:border-gold/50 [&>option]:bg-[#0D1B2A] min-w-[200px]"
        aria-label="Sort by"
      >
        {SORT_OPTS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {locationLoading && <span className="text-sm text-gold">Getting location…</span>}
    </div>
  );
}
