ALTER TABLE "WantedItem" ADD COLUMN IF NOT EXISTS "unitsPerPack" INTEGER;
UPDATE "WantedItem" SET "unitsPerPack" = 1 WHERE "quantityKind" = 'PACK' AND "unitsPerPack" IS NULL;
