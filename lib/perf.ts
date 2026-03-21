/**
 * Performance profiling and audit logging.
 * All messages use the [Perf] prefix so you can filter in the browser console:
 *   Console filter: "Perf" or "[Perf]"
 *
 * Use NODE_ENV=development or NEXT_PUBLIC_PERF_AUDIT=1 to enable.
 */

const PREFIX = "[Perf]";
const AUDIT_PREFIX = "[Audit]";

const isDev =
  typeof process !== "undefined" && process.env?.NODE_ENV === "development";
const forceAudit =
  typeof process !== "undefined" &&
  process.env?.NEXT_PUBLIC_PERF_AUDIT === "1";
const enabled = isDev || forceAudit;

const timers = new Map<string, number>();

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

/** Build one-line summary from payload for console (so you see numbers without expanding Object). */
function summary(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof payload.durationMs === "number") parts.push(`${payload.durationMs}ms`);
  if (typeof payload.navigationDurationMs === "number") parts.push(`nav=${payload.navigationDurationMs}ms`);
  if (typeof payload.timeSinceLastRouteMs === "number") parts.push(`timeSinceRoute=${payload.timeSinceLastRouteMs}ms`);
  if (typeof payload.readyMs === "number") parts.push(`ready=${payload.readyMs}ms`);
  if (typeof payload.sinceNavMs === "number") parts.push(`sinceNav=${payload.sinceNavMs}ms`);
  if (payload.phase != null) parts.push(`phase=${String(payload.phase)}`);
  if (payload.from != null && payload.to != null) parts.push(`${payload.from} → ${payload.to}`);
  if (payload.url != null) parts.push(String(payload.url).slice(0, 50));
  if (payload.status != null) parts.push(`status=${payload.status}`);
  if (typeof payload.responseMs === "number") parts.push(`response=${payload.responseMs}ms`);
  if (typeof payload.domInteractiveMs === "number") parts.push(`domInteractive=${payload.domInteractiveMs}ms`);
  if (typeof payload.domContentLoadedMs === "number") parts.push(`domContentLoaded=${payload.domContentLoadedMs}ms`);
  if (typeof payload.loadEventMs === "number") parts.push(`loadEvent=${payload.loadEventMs}ms`);
  if (typeof payload.longTaskTotalMs === "number") parts.push(`longTaskTotal=${payload.longTaskTotalMs}ms`);
  if (typeof payload.longTaskCount === "number") parts.push(`longTaskCount=${payload.longTaskCount}`);
  return parts.length ? ` | ${parts.join(" ")}` : "";
}

/** Log a performance message (only in dev or when NEXT_PUBLIC_PERF_AUDIT=1). */
export function perfLog(
  message: string,
  data?: Record<string, unknown> | number
): void {
  if (!enabled || typeof console === "undefined") return;
  const payload =
    typeof data === "number"
      ? { durationMs: data }
      : data && Object.keys(data).length
        ? data
        : undefined;
  if (payload && typeof payload === "object") {
    console.log(`${PREFIX} ${message}${summary(payload)}`, payload);
  } else {
    console.log(`${PREFIX} ${message}`);
  }
}

/** Audit log for latency investigation (same conditions as perfLog). */
export function auditLog(
  event: string,
  detail?: Record<string, unknown> | number
): void {
  if (!enabled || typeof console === "undefined") return;
  const payload =
    typeof detail === "number"
      ? { durationMs: detail }
      : detail && Object.keys(detail).length
        ? detail
        : undefined;
  if (payload && typeof payload === "object") {
    console.log(`${AUDIT_PREFIX} ${event}${summary(payload)}`, payload);
  } else {
    console.log(`${AUDIT_PREFIX} ${event}`);
  }
}

/** Start a named timer. Call perfEnd with the same label to log duration. */
export function perfStart(label: string): void {
  if (!enabled) return;
  timers.set(label, performance.now());
}

/** End a named timer and log duration. */
export function perfEnd(label: string, logMessage?: string): number | undefined {
  if (!enabled) return undefined;
  const start = timers.get(label);
  if (start === undefined) return undefined;
  timers.delete(label);
  const duration = performance.now() - start;
  perfLog(logMessage ?? `${label}`, { durationMs: Math.round(duration), label });
  return duration;
}

/** Create a performance mark (for use with performance.measure). */
export function perfMark(name: string): void {
  if (!enabled || typeof performance === "undefined") return;
  try {
    performance.mark(name);
  } catch {
    // ignore
  }
}

/**
 * Measure between two marks and log the duration.
 * Returns duration in ms or undefined if measure failed.
 */
export function perfMeasure(
  name: string,
  startMark: string,
  endMark: string
): number | undefined {
  if (!enabled || typeof performance === "undefined") return undefined;
  try {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name, "measure");
    const last = entries[entries.length - 1];
    if (last) {
      const duration = last.duration;
      perfLog(`${name}`, {
        durationMs: Math.round(duration),
        startMark,
        endMark,
      });
      return duration;
    }
  } catch {
    // ignore
  }
  return undefined;
}

/** Get current high-resolution time (for manual timing). */
export function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Check if profiling is enabled (e.g. for conditional instrumentation). */
export function isPerfEnabled(): boolean {
  return enabled;
}
