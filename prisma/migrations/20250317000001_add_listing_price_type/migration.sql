-- AlterTable: Listing.priceType — FIXED = no offers; NEGOTIABLE = buyers can send offers (mandatory for new listings)
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "priceType" TEXT NOT NULL DEFAULT 'NEGOTIABLE';
