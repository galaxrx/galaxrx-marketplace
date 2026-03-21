-- Allow multiple orders per PaymentIntent (same-seller cart checkout)
DROP INDEX IF EXISTS "Order_stripePaymentId_key";
CREATE INDEX IF NOT EXISTS "Order_stripePaymentId_idx" ON "Order"("stripePaymentId");

CREATE TABLE "CartCheckoutAttempt" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "idempotencyScope" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "deliveryFeeExGstCents" INTEGER NOT NULL,
    "totalChargedCents" INTEGER NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "gstAmountCents" INTEGER NOT NULL,
    "netToSellerCents" INTEGER NOT NULL,
    "chargeModel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'QUOTED',
    "stripePaymentIntentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "taxClassification" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartCheckoutAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartCheckoutLine" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "grossAmountCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "gstProductCents" INTEGER NOT NULL,
    "netLineCents" INTEGER NOT NULL,

    CONSTRAINT "CartCheckoutLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CartCheckoutAttempt_buyerId_idempotencyScope_idempotencyKey_key" ON "CartCheckoutAttempt"("buyerId", "idempotencyScope", "idempotencyKey");
CREATE INDEX "CartCheckoutAttempt_stripePaymentIntentId_idx" ON "CartCheckoutAttempt"("stripePaymentIntentId");
CREATE INDEX "CartCheckoutLine_attemptId_idx" ON "CartCheckoutLine"("attemptId");
CREATE INDEX "CartCheckoutLine_listingId_idx" ON "CartCheckoutLine"("listingId");

ALTER TABLE "CartCheckoutLine" ADD CONSTRAINT "CartCheckoutLine_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CartCheckoutAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
