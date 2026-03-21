"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEBOUNCE_MS = 300;

export default function WantedSearch({ basePath = "/wanted/browse" }: { basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (value === current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (value.trim()) next.set("search", value.trim());
      else next.delete("search");
      next.delete("page");
      router.push(`${basePath}?${next.toString()}`, { scroll: false });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, searchParams, router, basePath]);

  return (
    <input
      name="search"
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search product name, strength, barcode..."
      className="flex-1 min-w-[12rem] max-w-xl px-4 py-2.5 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50"
      aria-label="Search wanted items"
    />
  );
}
