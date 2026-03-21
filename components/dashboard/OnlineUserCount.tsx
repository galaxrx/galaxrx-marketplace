"use client";

import { useState, useEffect } from "react";

const POLL_INTERVAL_MS = 90 * 1000; // 1.5 minutes

export default function OnlineUserCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/presence/online-count", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCount(typeof data.count === "number" ? data.count : 0);
        }
      } catch {
        setCount(null);
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (count === null) return null;

  return (
    <span
      className="flex items-center gap-1.5 text-sm text-white/70"
      title="Users active in the last 5 minutes"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
      <span>{count} online</span>
    </span>
  );
}
