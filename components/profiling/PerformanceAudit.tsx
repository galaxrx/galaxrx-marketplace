"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  perfLog,
  auditLog,
  perfMark,
  perfMeasure,
  perfNow,
  isPerfEnabled,
} from "@/lib/perf";

const ROUTE_MARK_PREFIX = "perf-route-";
const ROUTE_MEASURE_PREFIX = "perf-nav-";
const LONG_TASK_THRESHOLD_MS = 50;
const SLOW_FETCH_THRESHOLD_MS = 1000;
const LATENCY_SUMMARY_DELAY_MS = 2500;
/** Only log individual long tasks within this window after nav; then stop to avoid console flood. */
const LONG_TASK_LOG_WINDOW_MS = 20_000;
/** Disconnect long-task observer after this time so it stops running. */
const LONG_TASK_OBSERVER_MAX_MS = 25_000;

/** Navigation timing (legacy performance.timing). */
function getNavTiming(): {
  navStart: number;
  responseMs: number;
  domInteractiveMs: number;
  domContentLoadedMs: number;
  loadEventMs: number;
} | null {
  if (typeof performance === "undefined") return null;
  const timing = (performance as Performance & { timing?: Record<string, number> }).timing;
  if (!timing?.navigationStart) return null;
  const nav = timing.navigationStart;
  return {
    navStart: nav,
    responseMs: timing.responseStart ? timing.responseStart - nav : 0,
    domInteractiveMs: timing.domInteractive ? timing.domInteractive - nav : 0,
    domContentLoadedMs: timing.domContentLoadedEventEnd ? timing.domContentLoadedEventEnd - nav : 0,
    loadEventMs: timing.loadEventEnd ? timing.loadEventEnd - nav : 0,
  };
}

/**
 * Client-side performance audit. Logs to console with [Perf] and [Audit] prefixes.
 * Filter in DevTools: "Perf" or "Audit" to see only these messages.
 *
 * - Logs navigation timing breakdown (response, DOM, load) and App ready
 * - Logs every route change and time since previous route
 * - Instruments fetch (audit + slow-fetch log); session fetch called out explicitly
 * - Long tasks with sinceNavMs for correlation; optional latency summary after load
 */
export default function PerformanceAudit() {
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);
  const prevRouteTimeRef = useRef<number>(perfNow());
  const mountLoggedRef = useRef(false);
  const longTasksRef = useRef<{ durationMs: number; sinceNavMs: number }[]>([]);
  const slowFetchesRef = useRef<{ url: string; durationMs: number }[]>([]);
  const navStartRef = useRef<number>(0);

  // One-time mount: navigation timing breakdown, then App ready
  useEffect(() => {
    if (!isPerfEnabled()) return;

    if (!mountLoggedRef.current) {
      mountLoggedRef.current = true;

      const navTiming = getNavTiming();
      if (navTiming) {
        navStartRef.current = navTiming.navStart;
        auditLog("Navigation timing (breakdown)", {
          responseMs: navTiming.responseMs,
          domInteractiveMs: navTiming.domInteractiveMs,
          domContentLoadedMs: navTiming.domContentLoadedMs,
          loadEventMs: navTiming.loadEventMs,
          phase: "initial",
        });
      } else if (typeof performance !== "undefined" && performance.now) {
        navStartRef.current = performance.now();
      }

      const navStart = navStartRef.current;
      const readyMs =
        navStart > 0 && navStart < 1e15 ? Date.now() - navStart : Math.round(perfNow());

      auditLog("App ready (first client layout)", {
        pathname: pathname ?? "/",
        readyMs,
        sinceLoad: readyMs,
        phase: "first-paint",
      });
      perfMark(`${ROUTE_MARK_PREFIX}initial`);
      prevRouteTimeRef.current = perfNow();
    }
  }, [pathname]);

  // Route change: log and measure navigation duration
  useEffect(() => {
    if (!isPerfEnabled()) return;

    const prev = prevPathRef.current;
    const curr = pathname ?? "/";
    const currMark = `${ROUTE_MARK_PREFIX}${curr.replace(/\//g, "_") || "root"}`;

    // First run: create mark for initial route so next navigation can measure from it
    if (prev === null) {
      prevPathRef.current = curr;
      perfMark(currMark);
      return;
    }

    prevPathRef.current = curr;
    const now = perfNow();
    const navDurationMs = now - prevRouteTimeRef.current;
    prevRouteTimeRef.current = now;

    const prevMark = `${ROUTE_MARK_PREFIX}${prev.replace(/\//g, "_") || "root"}`;
    perfMark(currMark);
    perfMeasure(
      `${ROUTE_MEASURE_PREFIX}${prev.replace(/\//g, "_")}-to-${(pathname ?? "").replace(/\//g, "_") || "root"}`,
      prevMark,
      currMark
    );

    // timeSinceLastRouteMs = time between route changes (includes user idle + dev HMR)
    const rounded = Math.round(navDurationMs);
    const note =
      navDurationMs > 60_000
        ? "Long gap = user was on previous route; actual nav ≈ last _rsc fetch"
        : navDurationMs > 2000 && typeof process !== "undefined" && process.env?.NODE_ENV === "development"
          ? "In dev, Fast Refresh rebuilds can add 1–5s; true server cost = _rsc fetch duration above"
          : undefined;
    auditLog("Route change", {
      from: prev,
      to: pathname ?? "/",
      timeSinceLastRouteMs: rounded,
      note,
    });

    // Only flag as slow when it's a real navigation (< 1 min), not "user sat on page for 13 min"
    if (navDurationMs > 500 && navDurationMs < 60_000) {
      perfLog("Slow navigation (consider investigating)", {
        from: prev,
        to: pathname ?? "/",
        timeSinceLastRouteMs: rounded,
      });
    }
  }, [pathname]);

  // Instrument fetch: audit every request; track slow fetches; call out session explicitly
  useEffect(() => {
    if (!isPerfEnabled() || typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = function (...args: Parameters<typeof fetch>) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as URL)?.href ?? "unknown";
      const isSession = url.includes("/api/auth/session");
      const start = perfNow();
      return originalFetch.apply(this, args).then(
        (response) => {
          const duration = Math.round(perfNow() - start);
          const isSlow = duration >= SLOW_FETCH_THRESHOLD_MS;
          if (isSlow) slowFetchesRef.current.push({ url: url.slice(0, 80), durationMs: duration });
          if (isSlow || isSession) {
            auditLog(isSession ? "Session fetch" : "fetch", {
              url: url.length > 80 ? url.slice(0, 80) + "…" : url,
              status: response.status,
              durationMs: duration,
              ...(isSession ? { phase: "session" } : {}),
            });
          }
          if (isSlow) perfLog("Slow fetch", { url: url.slice(0, 60), durationMs: duration });
          return response;
        },
        (err) => {
          const duration = Math.round(perfNow() - start);
          auditLog("fetch (failed)", {
            url: url.length > 80 ? url.slice(0, 80) + "…" : url,
            durationMs: duration,
            error: String(err),
          });
          throw err;
        }
      );
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Long task observer: log only during initial window, then stop to avoid endless console flood
  useEffect(() => {
    if (!isPerfEnabled() || typeof window === "undefined") return;

    try {
      let disconnected = false;
      const observer = new PerformanceObserver((list) => {
        if (disconnected) return;
        for (const entry of list.getEntries()) {
          const duration = entry.duration;
          if (duration >= LONG_TASK_THRESHOLD_MS) {
            const sinceNavMs = Math.round(entry.startTime);
            longTasksRef.current.push({ durationMs: Math.round(duration), sinceNavMs });
            if (sinceNavMs < LONG_TASK_LOG_WINDOW_MS) {
              perfLog("Long task (main thread blocked)", {
                durationMs: Math.round(duration),
                name: entry.name,
                sinceNavMs,
                phase: sinceNavMs < 10000 ? "initial-load" : "post-load",
              });
            }
          }
        }
      });
      observer.observe({ type: "longtask", buffered: true });

      const stopAt = setTimeout(() => {
        disconnected = true;
        observer.disconnect();
      }, LONG_TASK_OBSERVER_MAX_MS);

      return () => {
        clearTimeout(stopAt);
        observer.disconnect();
      };
    } catch {
      // longtask not supported in all browsers
    }
  }, []);

  // One-time latency summary after load (helps identify main cost from one log block)
  useEffect(() => {
    if (!isPerfEnabled() || typeof window === "undefined") return;

    const t = setTimeout(() => {
      const longTasks = longTasksRef.current;
      const slowFetches = slowFetchesRef.current;
      const longTaskTotalMs = longTasks.reduce((s, t) => s + t.durationMs, 0);
      auditLog("Latency summary (paste this block for analysis)", {
        longTaskTotalMs,
        longTaskCount: longTasks.length,
        slowFetchCount: slowFetches.length,
        slowFetches: slowFetches.slice(0, 10).map((f) => `${f.durationMs}ms ${f.url}`),
        phase: "post-load",
      });
      if (longTaskTotalMs > 500) {
        perfLog("High main-thread cost: consider code-splitting, deferring non-critical JS", {
          longTaskTotalMs,
          longTaskCount: longTasks.length,
        });
      }
    }, LATENCY_SUMMARY_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  return null;
}
