-- AlterTable: authoritative total charged in cents on Order so refund route uses DB for refund-limit checks (no float recomputation for new orders).
ALTER TABLE "Order" ADD COLUMN "totalChargedCents" INTEGER;
