"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CATEGORY_OPTIONS } from "@/lib/categories";
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const EXPIRY_OPTS = [
  { value: "", label: "All" },
  { value: "under30", label: "< 30 days" },
  { value: "30-60", label: "30–60 days" },
  { value: "60-90", label: "60–90 days" },
  { value: "over90", label: "Over 90 days" },
];
const SORT_OPTS = [
  { value: "newest", label: "Date (newest)" },
  { value: "oldest", label: "Date (oldest)" },
  { value: "nearest", label: "Nearest (distance)" },
  { value: "price", label: "Price low → high" },
  { value: "expiry", label: "Expiry soonest" },
  { value: "discount", label: "Biggest discount" },
];

type ListingFiltersProps = { basePath?: string; defaultMaxPrice?: string };
export default function ListingFilters({ basePath: basePathProp, defaultMaxPrice }: ListingFiltersProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = basePathProp ?? (pathname === "/buy" ? "/buy" : "/listings");
  const category = searchParams.get("category") ?? "";
  const state = searchParams.get("state") ?? "";
  const expiry = searchParams.get("expiry") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const fulfillment = searchParams.get("fulfillment") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? defaultMaxPrice ?? "200";

  const [locationLoading, setLocationLoading] = useState(false);

  const update = useCallback(
    (key: string, val: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (val) next.set(key, val);
      else next.delete(key);
      router.push(`${basePath}?${next.toString()}`);
    },
    [basePath, router, searchParams]
  );

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

  const selectClass =
    "w-full min-w-[7rem] px-2 py-1.5 rounded-lg text-sm listing-filter-select " +
    "bg-white/5 border border-[rgba(161,130,65,0.25)] text-white focus:ring-2 focus:ring-gold focus:border-gold/50 [&>option]:bg-[#0D1B2A]";
  const inputClass =
    "w-24 min-w-[5rem] px-2 py-1 rounded-lg text-sm listing-filter-input " +
    "bg-white/5 border border-[rgba(161,130,65,0.25)] text-white placeholder-white/40 focus:ring-2 focus:ring-gold [&::placeholder]:text-white/30";
  return (
    <section className="listing-filters-panel w-full p-4 rounded-xl bg-mid-navy/80 border border-[rgba(161,130,65,0.18)]">
      <div className="flex flex-wrap gap-x-4 gap-y-3 items-end">
        {/* Sort */}
        <div className="min-w-[8rem]">
          <label className="block text-xs font-medium text-white/70 mb-1">Sort by</label>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            disabled={locationLoading}
            className={selectClass}
            aria-label="Sort by"
          >
            {SORT_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {locationLoading && <p className="text-xs text-gold mt-1">Getting location…</p>}
        </div>
        <div className="min-w-[8rem]">
          <label className="block text-xs font-medium text-white/70 mb-1">Category</label>
          <select value={category} onChange={(e) => update("category", e.target.value)} className={selectClass}>
            <option value="">All</option>
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[6rem]">
          <label className="block text-xs font-medium text-white/70 mb-1">State</label>
          <select value={state} onChange={(e) => update("state", e.target.value)} className={selectClass}>
            <option value="">All</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[7rem]">
          <label className="block text-xs font-medium text-white/70 mb-1">Expiry</label>
          <select value={expiry} onChange={(e) => update("expiry", e.target.value)} className={selectClass}>
            {EXPIRY_OPTS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[6rem]">
          <label className="block text-xs font-medium text-white/70 mb-1">Condition</label>
          <select value={condition} onChange={(e) => update("condition", e.target.value)} className={selectClass}>
            <option value="">All</option>
            <option value="SEALED">Sealed</option>
            <option value="OPENED">Opened</option>
          </select>
        </div>
        <div className="min-w-[8rem]">
          <label className="block text-xs font-medium text-white/70 mb-1">Delivery</label>
          <select value={fulfillment} onChange={(e) => update("fulfillment", e.target.value)} className={selectClass}>
            <option value="">All</option>
            <option value="PICKUP_ONLY">Pickup only</option>
            <option value="LOCAL_COURIER">Local courier</option>
            <option value="NATIONAL_SHIPPING">National shipping</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1">Price range ($)</label>
          <div className="flex gap-1 items-center">
            <input type="number" min={0} step={1} value={minPrice} onChange={(e) => update("minPrice", e.target.value)} className={inputClass} placeholder="0" />
            <span className="text-white/50">–</span>
            <input type="number" min={0} step={1} value={maxPrice} onChange={(e) => update("maxPrice", e.target.value)} className={inputClass} placeholder="200" />
          </div>
        </div>
      </div>
    </section>
  );
}
