import { PrismaClient } from "@prisma/client";

/**
 * Reuse one client per runtime isolate (dev HMR + Vercel serverless warm instances).
 * Assigning only in development left production creating extra clients per cold path and
 * increased DB connection churn under load.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Supabase transaction pooler (6543) + Prisma parallel queries → P2024 if connection_limit=1.
 * Mutates DATABASE_URL at runtime so production survives a mis-set Vercel env until it is fixed.
 */
function patchSupabaseTransactionPoolerUrl(url: string): string {
  if (!url || !url.includes("pooler.supabase.com") || !/:6543(\?|\/|$)/.test(url)) {
    return url;
  }
  let next = url;
  if (/connection_limit=1(?=&|$)/i.test(next)) {
    next = next.replace(/connection_limit=1(?=&|$)/gi, "connection_limit=10");
  }
  if (!/pool_timeout=/i.test(next)) {
    next += next.includes("?") ? "&pool_timeout=30" : "?pool_timeout=30";
  }
  return next;
}

let databaseUrl = process.env.DATABASE_URL ?? "";
const patchedUrl = patchSupabaseTransactionPoolerUrl(databaseUrl);
if (patchedUrl !== databaseUrl) {
  process.env.DATABASE_URL = patchedUrl;
  databaseUrl = patchedUrl;
  console.info(
    "[prisma] Adjusted DATABASE_URL for Supabase transaction pooler (connection_limit≥10, pool_timeout=30). Update Vercel env to match docs/VERCEL-DEPLOY.md so this patch is not required."
  );
}

if (
  process.env.NODE_ENV === "production" &&
  databaseUrl.includes("pooler.supabase.com") &&
  /:[0-9]+/.test(databaseUrl) &&
  !/:6543(\?|\/|$)/.test(databaseUrl)
) {
  console.error(
    "[prisma] DATABASE_URL uses a non-6543 port on *.pooler.supabase.com. For Vercel, set DATABASE_URL to the Transaction pooler (port 6543) with pgbouncer=true. Session pooler (5432) belongs in DIRECT_URL for migrations only — if 5432 is in DATABASE_URL, you will get MaxClientsInSessionMode."
  );
}

if (
  process.env.NODE_ENV === "production" &&
  databaseUrl.includes("pooler.supabase.com") &&
  /:6543(\?|\/|$)/.test(databaseUrl) &&
  /connection_limit=1(?:&|$)/i.test(databaseUrl)
) {
  console.warn(
    "[prisma] DATABASE_URL has connection_limit=1 but the app uses parallel Prisma queries. Expect P2024 pool timeouts and higher latency. Set connection_limit=10&pool_timeout=30 on the transaction pooler URL (Vercel env)."
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
