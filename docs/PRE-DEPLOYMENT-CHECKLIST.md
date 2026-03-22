# Pre-deployment checklist (Vercel / production)

Use this **before** pointing production traffic at Vercel. Sections: **Database**, **APIs**, **Payments**, **Auth & secrets**, **External services**, **Scale (~1000 concurrent users)**.

---

## 1. Database (PostgreSQL / Supabase)

### Connection string for serverless (critical)

| Check | Action |
|--------|--------|
| **Pooled URL for app** | On Vercel, set `DATABASE_URL` to Supabase **Transaction pooler** (port **`6543`**) with **`?pgbouncer=true&connection_limit=10&pool_timeout=30&sslmode=require`** (see `.env.example`). **Do not use Session pooler (`5432`)** for the app URL — it triggers **`MaxClientsInSessionMode`**. **`connection_limit=1`** is unsafe here: parallel queries → **P2024** timeouts. |
| **Migrations vs runtime** | Set **`DATABASE_URL`** (transaction `6543`) **and** **`DIRECT_URL`** (session pooler `5432` on same `*.pooler.supabase.com` host). Prisma uses **`directUrl`** for `migrate deploy` so the build does not hang on PgBouncer transaction mode. Avoid **`db.*.supabase.co`** for **`DATABASE_URL`** on Vercel — common **P1001**. |
| **SSL** | Supabase URLs usually include `sslmode=require` or equivalent. Keep as provided. |
| **Backups** | Enable Supabase **Point-in-time recovery** / backups for production. |

### Data integrity

| Check | Action |
|--------|--------|
| **Migrations applied** | `npx prisma migrate deploy` against production (or build command includes it — see `docs/VERCEL-DEPLOY.md`). |
| **Schema matches code** | No pending local `db push`-only changes that were never migrated. |

### App ↔ DB (codebase)

| Item | Status |
|------|--------|
| Prisma client reuse | `lib/prisma.ts` caches `PrismaClient` on `globalThis` in **all** environments (reduces connection churn on Vercel). |
| Indexes | `schema.prisma` defines indexes on hot paths (listings, orders, payments, messages, etc.). |

---

## 2. APIs (Next.js Route Handlers)

| Check | Action |
|--------|--------|
| **Health** | `GET /api/health` returns JSON (no DB) — use for uptime monitors. |
| **Stripe webhook** | Must be **public** (not behind NextAuth). Confirm `middleware.ts` **does not** match `/api/stripe/webhook`. Current matcher: dashboard routes only — webhook is open. ✓ |
| **Env at runtime** | All routes that call Stripe/Resend/DB fail gracefully or return 503 if env missing — spot-check `create-payment-intent`, `webhook`. |
| **Rate limiting** | There is **no** global API rate limit in this repo. Abuse (login brute-force, search spam) relies on Vercel/platform limits and your WAF rules. For high exposure, consider Vercel Firewall, Upstash rate limiting, or Cloudflare in front. |
| **Heavy routes** | Listing browse uses Prisma + optional distance sort; under extreme load, add caching (ISR) or read replica later — not required for first launch if DB is pooled. |

---

## 3. Payments (Stripe)

| Check | Action |
|--------|--------|
| **Live vs test** | Production uses **live** keys (`sk_live_…`, `pk_live_…`) and **live** webhook secret. |
| **Webhook URL** | Stripe Dashboard → endpoint `https://<your-domain>/api/stripe/webhook` with events your code handles (`payment_intent.succeeded`, failures, disputes, etc.). |
| **`STRIPE_WEBHOOK_SECRET`** | Matches the **signing secret** of that endpoint exactly (Vercel env, then redeploy). |
| **Connect webhook** | If you use Connect separately, set `STRIPE_CONNECT_WEBHOOK_SECRET` and URL for `api/stripe/connect-webhook` (if applicable). |
| **Idempotency** | Webhook persists `StripeEvent` and skips duplicate `eventId` processing. ✓ |
| **Destination vs direct** | `STRIPE_USE_DIRECT_CHARGES` matches your Stripe architecture; test one real payment in **live** with a small amount before marketing. |

---

## 4. Auth (NextAuth)

| Check | Action |
|--------|--------|
| **`NEXTAUTH_URL`** | Exactly the public site URL, e.g. `https://yourapp.vercel.app` or custom domain, **https**, no trailing slash issues. |
| **`NEXTAUTH_SECRET`** | Strong random string; **never** commit; same family of secret as local prod-like testing. |
| **`AUTH_TRUST_HOST`** | `true` on Vercel (see `.env.example`). |

---

## 5. Other required env (minimum viable production)

Copy from `.env.example` / your local `.env` into Vercel **Production**:

- `DATABASE_URL` (pooled)
- `NEXTAUTH_*`, `AUTH_TRUST_HOST`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain in Resend)
- `UPLOADTHING_*` if listings/logos use UploadThing

Optional: Australia Post, barcode, register of pharmacies, PBS, Medipim — only if you use those features in production.

---

## 6. “1000 users at the same time” — realistic expectations

**Important:** “1000 concurrent users” usually means **many simultaneous HTTP requests**, not 1000 open WebSockets. This stack can handle **high read traffic** if the database tier and pooling are right.

| Layer | What to rely on |
|--------|------------------|
| **Vercel** | Auto-scales serverless functions horizontally. Not the usual bottleneck for read-heavy marketplace pages. |
| **Bottleneck** | Almost always **Postgres connection count** and **query cost**. Mitigation: **pooled `DATABASE_URL`**, adequate **Supabase compute/plan**, Prisma client reuse (fixed in `lib/prisma.ts`), sensible indexes (already present). |
| **Writes** | Checkout, webhooks, reservations — keep transactions short; webhook already idempotent. |
| **If you outgrow a single DB** | Later: read replica for browse, Prisma Accelerate, caching (Redis/Upstash), CDN for static assets. Not required for day-one launch if pooler + plan are sized. |

**Supabase:** Check **project limits** (connections, compute). For sustained ~1000 **concurrent** DB-heavy operations, you may need **Pro** or higher — confirm with Supabase docs for your tier.

---

## 7. Final go / no-go (manual)

- [ ] Production DB exists; migrations applied; **pooled** URL on Vercel  
- [ ] `NEXTAUTH_URL` matches live domain  
- [ ] Stripe **live** webhook + secret; one **small live** payment tested end-to-end  
- [ ] Resend sends from a **verified** domain  
- [ ] Build on Vercel succeeds (`prisma migrate deploy && npm run build` or equivalent)  
- [ ] `/api/health` 200 on production URL  
- [ ] Login + one critical flow (e.g. browse listing, or cart) smoke-tested on production  

---

## Related docs

- `docs/VERCEL-DEPLOY.md` — step-by-step Vercel import and env names  
- `docs/PUSH-TO-GITHUB.md` — pushing updates after changes  

---

*Last reviewed with codebase: Prisma singleton fix in `lib/prisma.ts`; middleware excludes API webhooks from auth.*
