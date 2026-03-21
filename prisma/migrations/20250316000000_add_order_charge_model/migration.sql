-- AlterTable: persist charge model on Order so refund route uses DB as source of truth (no Stripe metadata lookup).
ALTER TABLE "Order" ADD COLUMN "chargeModel" TEXT;
