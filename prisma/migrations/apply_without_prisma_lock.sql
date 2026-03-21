-- Run this entire script once in Supabase SQL Editor (no .env changes, no Prisma advisory lock).
-- 1) Release any advisory lock so future "prisma migrate deploy" can run
-- 2) Mark the failed migration as applied
-- 3) Apply the enum migration (idempotent where possible)
-- 4) Record the enum migration in _prisma_migrations so Prisma stays in sync

-- 1) Release advisory lock held by idle connections
SELECT pg_terminate_backend(psa.pid)
FROM pg_locks AS pl
INNER JOIN pg_stat_activity AS psa ON psa.pid = pl.pid
WHERE psa.state = 'idle'
  AND pl.objid = 72707369;

-- 2) Mark failed migration as successfully applied (clears "failed" state)
UPDATE _prisma_migrations
SET finished_at = now(), rolled_back_at = null, logs = null
WHERE migration_name = '20260317000000_descriptive_name'
  AND finished_at IS NULL;

-- 3) Apply enum migration (create types only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingPriceType') THEN
    CREATE TYPE "ListingPriceType" AS ENUM ('FIXED', 'NEGOTIABLE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ListingNegotiationStatus') THEN
    CREATE TYPE "ListingNegotiationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
  END IF;
END $$;

-- AlterTable Listing: constrain priceType to enum (safe if already enum)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Listing' AND column_name = 'priceType'
  ) AND (
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Listing' AND column_name = 'priceType'
  ) = 'character varying' THEN
    ALTER TABLE "Listing" ALTER COLUMN "priceType" DROP DEFAULT;
    ALTER TABLE "Listing" ALTER COLUMN "priceType" TYPE "ListingPriceType" USING ("priceType"::"ListingPriceType");
    ALTER TABLE "Listing" ALTER COLUMN "priceType" SET DEFAULT 'NEGOTIABLE'::"ListingPriceType";
  END IF;
END $$;

-- AlterTable ListingNegotiation: constrain status to enum (safe if already enum)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ListingNegotiation' AND column_name = 'status'
  ) AND (
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ListingNegotiation' AND column_name = 'status'
  ) = 'character varying' THEN
    ALTER TABLE "ListingNegotiation" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "ListingNegotiation" ALTER COLUMN "status" TYPE "ListingNegotiationStatus" USING ("status"::"ListingNegotiationStatus");
    ALTER TABLE "ListingNegotiation" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"ListingNegotiationStatus";
  END IF;
END $$;

-- 4) Record enum migration so "prisma migrate deploy" sees it as applied (skip if already there)
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
SELECT gen_random_uuid()::text, 'be9cda9ef9b80e3f82f3ead88e3b52a5eb1d20113d168bba5f137d145885a5ba', now(), '20260317000001_add_listing_price_type_and_negotiation_status_enums', null, null, now(), 1
WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations WHERE migration_name = '20260317000001_add_listing_price_type_and_negotiation_status_enums');
