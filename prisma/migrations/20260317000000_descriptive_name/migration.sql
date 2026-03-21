-- AlterTable (idempotent)
ALTER TABLE "ListingNegotiation" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable (idempotent: only add reservationStatus if it does not already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PaymentAttempt'
      AND column_name = 'reservationStatus'
  ) THEN
    ALTER TABLE "PaymentAttempt" ADD COLUMN "reservationStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
  END IF;
END $$;

-- AlterTable (idempotent: add StripeEvent columns only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'StripeEvent' AND column_name = 'lastRetryAt'
  ) THEN
    ALTER TABLE "StripeEvent" ADD COLUMN "lastRetryAt" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'StripeEvent' AND column_name = 'retryCount'
  ) THEN
    ALTER TABLE "StripeEvent" ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "Message_recipientId_isRead_idx" ON "Message"("recipientId", "isRead");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_listingId_reservationStatus_idx" ON "PaymentAttempt"("listingId", "reservationStatus");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_reservationStatus_expiresAt_idx" ON "PaymentAttempt"("reservationStatus", "expiresAt");
CREATE INDEX IF NOT EXISTS "StripeEvent_processingStatus_lastRetryAt_idx" ON "StripeEvent"("processingStatus", "lastRetryAt");
