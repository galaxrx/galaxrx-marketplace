-- CreateTable
CREATE TABLE "PurchaseEmailDedup" (
    "id" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseEmailDedup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseEmailDedup_stripePaymentIntentId_channel_key" ON "PurchaseEmailDedup"("stripePaymentIntentId", "channel");

-- CreateIndex
CREATE INDEX "PurchaseEmailDedup_stripePaymentIntentId_idx" ON "PurchaseEmailDedup"("stripePaymentIntentId");
