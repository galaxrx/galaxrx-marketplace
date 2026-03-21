# Scalability: 100,000 Users

Short assessment of whether the current database and infrastructure can support ~100,000 users uploading data and listings.

---

## Database (PostgreSQL / Supabase)

**Verdict: Yes, with the right plan and configuration.**

- **PostgreSQL** scales well; Supabase tiers support many connections and storage.
- **Indexes** have been added in `prisma/schema.prisma` for:
  - Listings: `isActive` + `createdAt`, `pharmacyId`, `category`, `isClearance`, `expiryDate`
  - Orders: `buyerId`, `sellerId`, `listingId`
  - Messages: `threadId`, `recipientId`  
  Run `npx prisma migrate dev` (or deploy migrations) so these exist in the DB.

**Required for 100k users:**

1. **Connection pooling**  
   Use Supabase’s **pooled** connection string (Transaction or Session mode), not the direct Postgres URL, especially if the app runs on serverless (e.g. Vercel). Example:
   - Direct: `postgresql://...@db.xxx.supabase.co:5432/postgres`
   - Pooled: `postgresql://...@db.xxx.supabase.co:6543/postgres?pgbouncer=true`  
   Set `DATABASE_URL` to the pooled URL in production.

2. **Supabase plan**  
   Choose a plan that matches expected connections and storage (e.g. Pro or higher for 100k users and growth).

3. **Backups and monitoring**  
   Use Supabase backups and monitor slow queries and connection usage.

---

## File storage (listings & logos)

**Verdict: Local `public/uploads` is not suitable for 100k users.**

- Files under `public/uploads` (logos, listing images) are stored on the app server’s disk.
- Problems at scale: no redundancy, doesn’t work across multiple app instances, no CDN, and serverless has no persistent disk.
- **Use object storage for production:** Uploadthing (already integrated), or S3/R2/Cloudflare, etc.

**Recommendation:**

- **Production:** Configure **Uploadthing** (set `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID`). All listing and logo uploads should go to Uploadthing (or another object store), not local disk.
- Keep the local fallback only for dev or as a temporary fallback; do not rely on it for 100k users.

---

## Application hosting

- **Vercel (serverless):** Works at scale if you use a **pooled** DB URL and **external file storage** (Uploadthing/S3). No change needed for “100k users” beyond DB and storage.
- **Single VPS:** Can work for moderate traffic; ensure enough RAM/CPU and that DB and file storage are not on the same box for production. Prefer moving files to object storage and using the pooled DB URL.

---

## Summary

| Area           | Ready for 100k? | Action |
|----------------|------------------|--------|
| Database       | Yes, with config | Use Supabase **pooled** URL; run migrations for new indexes; choose appropriate plan. |
| File uploads   | No (local disk) | Use **Uploadthing** (or S3/R2) in production; set env vars and use it for all uploads. |
| App (Next.js)  | Yes             | Deploy on Vercel or similar; ensure env points to pooled DB and object storage. |

**Bottom line:** The database and app design can support ~100,000 users **if** you (1) use a pooled Postgres URL, (2) run the new indexes, and (3) use cloud object storage (e.g. Uploadthing) for all user uploads instead of local disk.
