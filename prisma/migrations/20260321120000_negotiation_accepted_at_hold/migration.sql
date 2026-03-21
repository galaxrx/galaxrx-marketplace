-- AlterTable
ALTER TABLE "ListingNegotiation" ADD COLUMN "acceptedAt" TIMESTAMP(3);

-- Existing accepted rows: treat prior acceptance time as updatedAt so behaviour is unchanged right after deploy
UPDATE "ListingNegotiation" SET "acceptedAt" = "updatedAt" WHERE "status" = 'ACCEPTED';
