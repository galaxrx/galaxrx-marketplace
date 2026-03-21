-- Ensure at most one ACCEPTED negotiation per (listingId, buyerId).
-- Application logic already rejects other ACCEPTED when accepting; this enforces at DB level (races, bugs, direct edits).
-- IF NOT EXISTS so safe to run manually (e.g. Supabase SQL Editor) and again later via migrate deploy.
CREATE UNIQUE INDEX IF NOT EXISTS "ListingNegotiation_listingId_buyerId_ACCEPTED_key"
ON "ListingNegotiation"("listingId", "buyerId")
WHERE status = 'ACCEPTED';
