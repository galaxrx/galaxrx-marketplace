-- Formalize PaymentAttempt idempotency: scoped unique (buyerId, idempotencyScope, idempotencyKey)
-- and fields for strict reuse (taxClassification, negotiatedPriceSource, listingNegotiationId).

-- Add new columns (idempotencyScope nullable until backfilled)
ALTER TABLE "PaymentAttempt" ADD COLUMN IF NOT EXISTS "idempotencyScope" TEXT;
ALTER TABLE "PaymentAttempt" ADD COLUMN IF NOT EXISTS "taxClassification" TEXT;
ALTER TABLE "PaymentAttempt" ADD COLUMN IF NOT EXISTS "negotiatedPriceSource" TEXT;
ALTER TABLE "PaymentAttempt" ADD COLUMN IF NOT EXISTS "listingNegotiationId" TEXT;

-- Backfill idempotencyScope: listingId for listing flow, "wanted:{id}" for wanted-offer flow
UPDATE "PaymentAttempt"
SET "idempotencyScope" = COALESCE("listingId", 'wanted:' || "wantedOfferId", 'legacy:' || "id")
WHERE "idempotencyScope" IS NULL;

ALTER TABLE "PaymentAttempt" ALTER COLUMN "idempotencyScope" SET NOT NULL;

-- Drop legacy unique on idempotencyKey and its index
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT IF EXISTS "PaymentAttempt_idempotencyKey_key";
DROP INDEX IF EXISTS "PaymentAttempt_idempotencyKey_idx";

-- Add scoped unique: one attempt per (buyer, scope, key)
CREATE UNIQUE INDEX "PaymentAttempt_buyerId_idempotencyScope_idempotencyKey_key"
ON "PaymentAttempt"("buyerId", "idempotencyScope", "idempotencyKey");
