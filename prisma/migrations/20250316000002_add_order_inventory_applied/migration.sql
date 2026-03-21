-- AlterTable: Order.inventoryApplied — true when core side effects applied (listing qty/reservedQty + seller tradeCount, or wanted-offer seller tradeCount); retry-safe.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "inventoryApplied" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: PaymentAttempt.chargeModel — authoritative at checkout for webhook (wanted-offer and listing).
ALTER TABLE "PaymentAttempt" ADD COLUMN IF NOT EXISTS "chargeModel" TEXT;
