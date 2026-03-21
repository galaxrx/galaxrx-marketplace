-- CreateTable
CREATE TABLE "ListingNegotiation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "proposedPricePerPack" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingNegotiation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingNegotiation_listingId_idx" ON "ListingNegotiation"("listingId");

-- CreateIndex
CREATE INDEX "ListingNegotiation_buyerId_idx" ON "ListingNegotiation"("buyerId");

-- CreateIndex
CREATE INDEX "ListingNegotiation_status_idx" ON "ListingNegotiation"("status");

-- AddForeignKey
ALTER TABLE "ListingNegotiation" ADD CONSTRAINT "ListingNegotiation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingNegotiation" ADD CONSTRAINT "ListingNegotiation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
