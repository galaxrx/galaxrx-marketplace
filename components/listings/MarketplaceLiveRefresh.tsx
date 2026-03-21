"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const REFRESH_MS = 30_000;

/**
 * Keeps server-rendered marketplace grids fresh after another user buys stock:
 * refresh when the tab becomes visible and on a light interval while on browse routes.
 */
export default function MarketplaceLiveRefresh() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const browse =
      pathname === "/buy" ||
      pathname === "/listings" ||
      pathname.startsWith("/listings/") ||
      /^\/wanted\/[^/]+\/matches$/.test(pathname);

    if (!browse) return;

    const refresh = () => router.refresh();

    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVis);
    const interval = setInterval(refresh, REFRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(interval);
    };
  }, [router, pathname]);

  return null;
}
