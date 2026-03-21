import { PrismaClient } from "@prisma/client";

/**
 * Reuse one client per runtime isolate (dev HMR + Vercel serverless warm instances).
 * Assigning only in development left production creating extra clients per cold path and
 * increased DB connection churn under load.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
