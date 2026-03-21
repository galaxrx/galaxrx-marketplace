"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const DEBOUNCE_MS = 300;

function ListingsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("search") ?? "");
  const basePath = pathname === "/buy" ? "/buy" : "/listings";

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (value === current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (value.trim()) next.set("search", value.trim());
      else next.delete("search");
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
      placeholder="Search Panadol, Ventolin, Ozempic..."
      className="w-full min-w-0 px-4 py-2.5 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50"
      aria-label="Search drug name"
    />
  );
}

export default ListingsSearch;
