-- Fix: "The column Listing.noteToPurchasers does not exist in the current database"
--
-- 1. Open your Supabase project → SQL Editor (or run this in any PostgreSQL client).
-- 2. Paste and run this entire script.
-- 3. Restart your dev server and refresh the BUY page.

ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "noteToPurchasers" TEXT;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
