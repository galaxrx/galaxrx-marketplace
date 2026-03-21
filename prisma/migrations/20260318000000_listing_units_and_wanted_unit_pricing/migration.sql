-- Listing: stock in units (partial pack sales). Migrate from packs × packSize.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "quantityUnits" INTEGER;
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "reservedUnits" INTEGER NOT NULL DEFAULT 0;

UPDATE "Listing"
SET
  "quantityUnits" = COALESCE("quantityPacks", 0) * GREATEST(COALESCE("packSize", 1), 1),
  "reservedUnits" = COALESCE("reservedQty", 0) * GREATEST(COALESCE("packSize", 1), 1)
WHERE "quantityUnits" IS NULL;

ALTER TABLE "Listing" ALTER COLUMN "quantityUnits" SET NOT NULL;

ALTER TABLE "Listing" DROP COLUMN IF EXISTS "quantityPacks";
ALTER TABLE "Listing" DROP COLUMN IF EXISTS "reservedQty";

-- Wanted: quantity as packs vs units; per-unit offer price
ALTER TABLE "WantedItem" ADD COLUMN IF NOT EXISTS "quantityKind" TEXT NOT NULL DEFAULT 'PACK';

ALTER TABLE "WantedOffer" ADD COLUMN IF NOT EXISTS "pricePerUnit" DOUBLE PRECISION;
