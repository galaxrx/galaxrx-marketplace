/**
 * One-time script: apply the "one ACCEPTED per (listingId, buyerId)" migration
 * without using `prisma migrate deploy` (avoids advisory lock timeout with Supabase pooler).
 *
 * Uses your existing DATABASE_URL from .env. No Supabase UI, no extra env files.
 *
 * Run: npx ts-node -P tsconfig.scripts.json scripts/run-one-accepted-migration.ts
 * Or: npx tsx scripts/run-one-accepted-migration.ts
 */
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MIGRATION_NAME = "20260317110000_one_accepted_negotiation_per_listing_buyer";

async function main() {
  // 0. Data cleanup: ensure at most one ACCEPTED per (listingId, buyerId) before creating the unique index.
  // Keep the newest by updatedAt; set older duplicates to REJECTED.
  const updateResult = await prisma.$executeRawUnsafe(`
    UPDATE "ListingNegotiation" n
    SET status = 'REJECTED'
    WHERE n.status = 'ACCEPTED'
      AND EXISTS (
        SELECT 1 FROM "ListingNegotiation" n2
        WHERE n2."listingId" = n."listingId" AND n2."buyerId" = n."buyerId" AND n2.status = 'ACCEPTED'
          AND n2."updatedAt" > n."updatedAt"
      )
  `);
  if (Number(updateResult) > 0) {
    console.log(`Cleaned up ${updateResult} duplicate ACCEPTED row(s); kept the newest per (listing, buyer).`);
  }

  // 1. Apply the index (idempotent)
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "ListingNegotiation_listingId_buyerId_ACCEPTED_key"
    ON "ListingNegotiation"("listingId", "buyerId")
    WHERE status = 'ACCEPTED';
  `);
  console.log("Index created (or already existed).");

  // 2. Mark migration as applied in Prisma's table (so future migrate deploy skips it)
  const migrationPath = join(
    process.cwd(),
    "prisma",
    "migrations",
    MIGRATION_NAME,
    "migration.sql"
  );
  const migrationSql = readFileSync(migrationPath, "utf-8");
  const checksum = createHash("sha256")
    .update(migrationSql.replace(/\r\n/g, "\n"))
    .digest("hex");

  const existing = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 LIMIT 1`,
    MIGRATION_NAME
  );
  if (existing.length > 0) {
    console.log("Migration already recorded in _prisma_migrations; skipping insert.");
  } else {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      id,
      checksum,
      now,
      MIGRATION_NAME,
      null,
      null,
      now,
      1
    );
    console.log("Migration recorded in _prisma_migrations.");
  }

  console.log("Done. You can run `npx prisma migrate deploy` later; this migration will be skipped.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
