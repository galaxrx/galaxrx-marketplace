import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

const isDev = process.env.NODE_ENV === "development";
const forceAudit = process.env.NEXT_PUBLIC_PERF_AUDIT === "1";

function withPerf(
  fn: (req: Request, context: unknown) => Promise<Response>
): (req: Request, context: unknown) => Promise<Response> {
  if (!isDev && !forceAudit) return fn;
  return async (req: Request, context: unknown) => {
    const url = req.url || "";
    const isSession = url.includes("/api/auth/session");
    const start = Date.now();
    const res = await fn(req, context);
    const duration = Date.now() - start;
    if (isSession) {
      console.log(
        `[Audit] GET /api/auth/session (server) | ${duration}ms`,
        { durationMs: duration, phase: "session-api" }
      );
      if (duration >= 1000) {
        console.warn(`[Perf] Slow session API (server) | ${duration}ms`, {
          durationMs: duration,
          phase: "session-api",
        });
      }
    }
    return res;
  };
}

const wrappedGet = withPerf(handler);
export const GET = wrappedGet;
export const POST = handler;
