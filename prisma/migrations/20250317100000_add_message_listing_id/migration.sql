-- AlterTable: Message.listingId — optional link to Listing for wanted-match product cards
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "listingId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_listingId_idx" ON "Message"("listingId");

-- AddForeignKey (only if column was just added; safe to run if already applied)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Message_listingId_fkey' AND table_name = 'Message'
  ) THEN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_listingId_fkey"
      FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
