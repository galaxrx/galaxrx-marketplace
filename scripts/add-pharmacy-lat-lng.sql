-- Add latitude/longitude to Pharmacy for "sort by nearest" (run in Supabase SQL Editor or via script).
ALTER TABLE "Pharmacy" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Pharmacy" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
