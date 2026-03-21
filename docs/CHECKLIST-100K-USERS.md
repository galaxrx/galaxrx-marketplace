# Step-by-step: Ready for 100,000 users (uploads + transactions)

Follow these steps in order. Check off each when done.

---

## Phase 1 — Database

### Step 1.1 — Use a pooled database connection (required for serverless)

If you deploy on **Vercel** or any serverless platform, the default Postgres connection will exhaust connections under load.

1. Open **Supabase Dashboard** → your project → **Settings** → **Database**.
2. Find **Connection string** and choose **“Transaction”** or **“Session”** (pooled) mode.
3. Copy the pooled URL (it uses port **6543**, not 5432). It may look like:
   - `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
4. In your **production** environment (e.g. Vercel → Project → Settings → Environment Variables), set:
   - **`DATABASE_URL`** = that pooled URL.
   - Add `?connect_timeout=5` at the end if you want timeouts (e.g. `...postgres?connect_timeout=5`).
5. Keep your **local** `.env` using the direct URL (port 5432) for development if you prefer.

- [ ] **Done:** Production uses pooled `DATABASE_URL` (port 6543).

---

### Step 1.2 — Apply database indexes

Indexes for listings, orders, and messages are already in `prisma/schema.prisma`. Create a migration and apply it.

**On your machine (dev):**

```bash
npx prisma migrate dev --name add_indexes_for_scale
```

**Production (e.g. Vercel):**

- If you use Prisma Migrate in CI/CD, run the same migration there.
- Or on your DB host run: `npx prisma migrate deploy` (with production `DATABASE_URL` set).

- [ ] **Done:** Migration created and applied (dev and production).

---

### Step 1.3 — Supabase plan and backups

1. In **Supabase Dashboard** → **Settings** → **Billing**, choose a plan that supports:
   - Enough **database size** and **connection pool** for 100k users (e.g. **Pro** or above).
2. In **Settings** → **Database** → **Backups**, ensure **Point-in-time recovery** or daily backups are enabled.

- [ ] **Done:** Plan supports scale; backups are enabled.

---

## Phase 2 — File uploads (photos)

### Step 2.1 — Create an Uploadthing account and app

1. Go to [uploadthing.com](https://uploadthing.com) and sign up.
2. Create an **app** (e.g. “GalaxRX”).
3. In the app dashboard, open **API Keys** (or **Developers**).
4. Copy:
   - **App ID**
   - **Secret key** (not the public token).

- [ ] **Done:** Uploadthing app created; App ID and Secret copied.

---

### Step 2.2 — Set Uploadthing env in production

In your **production** environment (e.g. Vercel):

1. Add:
   - **`UPLOADTHING_SECRET`** = your Uploadthing **Secret key**.
   - **`UPLOADTHING_APP_ID`** = your Uploadthing **App ID**.
2. Redeploy so the new env vars are used.

Your app already uses Uploadthing first for listing photos and logos; with these set, uploads will go to Uploadthing instead of local disk.

- [ ] **Done:** `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` set in production.

---

### Step 2.3 — (Optional) Use only Uploadthing in production

Right now the app falls back to local `/api/upload/listing-image` when Uploadthing fails. For production at scale you can:

- Rely on the fallback only for dev, **or**
- Add a check so in production you don’t use the local upload route (e.g. only call Uploadthing when `process.env.NODE_ENV === 'production'` or when `UPLOADTHING_SECRET` is set).

This step is optional; the important part is that Uploadthing is configured so most uploads go there.

- [ ] **Done (optional):** Production uses Uploadthing only; local fallback only in dev.

---

## Phase 3 — Transactions (Stripe)

### Step 3.1 — Stripe live keys and webhook in production

1. In [Stripe Dashboard](https://dashboard.stripe.com) switch to **Live** mode.
2. **Developers** → **API keys**: copy **Secret key** and **Publishable key**.
3. In **production** env set:
   - **`STRIPE_SECRET_KEY`** = Live secret key (starts with `sk_live_`).
   - **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** = Live publishable key (starts with `pk_live_`).
4. **Developers** → **Webhooks** → **Add endpoint**:
   - URL: `https://your-production-domain.com/api/stripe/webhook`
   - Events: at least **`payment_intent.succeeded`** (add others you use).
5. Copy the **Signing secret** (starts with `whsec_`) and set:
   - **`STRIPE_WEBHOOK_SECRET`** = that value.
6. Redeploy and trigger a test payment; confirm the webhook is received (Stripe Dashboard → Webhooks → your endpoint → “Recent deliveries”).

- [ ] **Done:** Live Stripe keys and webhook configured in production; test payment and webhook verified.

---

### Step 3.2 — Idempotency for payments (optional but recommended)

To avoid duplicate orders if the webhook is retried:

- Your webhook already uses `payment_intent.succeeded` and metadata (`listingId`, `buyerId`, etc.). Ensure you **create the order once** per payment (e.g. check if an order with this `stripePaymentId` or listing+buyer+amount already exists before creating).
- If not already there, add a **unique constraint** or check on `Order.stripePaymentId` (or a dedicated idempotency key) so the same payment cannot create two orders.

- [ ] **Done (optional):** Webhook is idempotent; duplicate payments do not create duplicate orders.

---

## Phase 4 — Application and env

### Step 4.1 — Production environment variables

In production (e.g. Vercel → Settings → Environment Variables), ensure **all** of these are set for the production environment:

| Variable | Purpose |
|----------|--------|
| `DATABASE_URL` | Pooled Supabase URL (Step 1.1) |
| `NEXTAUTH_URL` | Full app URL, e.g. `https://yourdomain.com` |
| `NEXTAUTH_SECRET` | Strong random secret (e.g. `openssl rand -base64 32`) |
| `UPLOADTHING_SECRET` | Uploadthing secret (Step 2.2) |
| `UPLOADTHING_APP_ID` | Uploadthing app ID (Step 2.2) |
| `STRIPE_SECRET_KEY` | Live secret key (Step 3.1) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (Step 3.1) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Live publishable key (Step 3.1) |
| `RESEND_API_KEY` | For transactional email (optional but recommended) |
| `EMAIL_FROM` | Sender for emails (e.g. `GalaxRX <noreply@galaxrx.com.au>`) |

- [ ] **Done:** All required production env vars set and redeployed.

---

### Step 4.2 — Hosting and deploy

1. Deploy the app (e.g. push to main if Vercel auto-deploys, or run your deploy command).
2. After deploy, run migrations against production DB if not automatic:
   - `DATABASE_URL=<production-pooled-url> npx prisma migrate deploy`
3. Smoke test: open the app, sign in, create a listing with a photo, and complete a test purchase (Stripe test or live, as appropriate).

- [ ] **Done:** App deployed; migrations applied; smoke test passed.

---

## Phase 5 — Monitoring and safety

### Step 5.1 — Supabase monitoring

- In **Supabase Dashboard** → **Reports** (or **Database** → **Query performance**), review slow queries and connection usage.
- Set alerts (if available) for high CPU, connections, or disk.

- [ ] **Done:** Monitoring and alerts reviewed/configured.

---

### Step 5.2 — Stripe and Uploadthing

- **Stripe:** Dashboard → Webhooks → ensure no repeated failures; fix any failing events.
- **Uploadthing:** Dashboard → check usage and limits; upgrade plan if needed for 100k users.

- [ ] **Done:** Stripe webhooks healthy; Uploadthing plan suitable for scale.

---

## Quick reference

| Area | What to do |
|------|------------|
| **Database** | Pooled `DATABASE_URL` (6543), run Prisma migration for indexes, Supabase plan + backups. |
| **Photos** | Set `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` in production; optional: disable local upload in prod. |
| **Payments** | Live Stripe keys + webhook URL + `STRIPE_WEBHOOK_SECRET`; verify webhook; optional idempotency. |
| **App** | All env vars set in production; deploy; run migrations; smoke test. |
| **Ongoing** | Supabase and Stripe/Uploadthing monitoring; backups enabled. |

When all steps are checked, the app is configured to handle ~100,000 users for uploads and transactions. For more detail, see `docs/SCALABILITY.md`.
