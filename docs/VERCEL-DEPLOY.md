# Deploy GalaxRX on Vercel

**Before first production deploy**, complete **[PRE-DEPLOYMENT-CHECKLIST.md](./PRE-DEPLOYMENT-CHECKLIST.md)** (database pooling, Stripe live webhooks, auth URL, scale notes).

Your repo is already on GitHub (`galaxrx/galaxrx-marketplace`). Vercel will **build from Git** on every push to `main`.

---

## 1. Create a Vercel account and import the repo

1. Go to **[vercel.com](https://vercel.com)** → **Sign up** (use **GitHub** so Vercel can see your repos).
2. **Add New…** → **Project**.
3. **Import** `galaxrx/galaxrx-marketplace`.
4. Vercel should detect **Next.js** automatically.
5. **Root Directory:** leave default (repo root).
6. **Build Command:** use the line below (important for Prisma migrations — see §3).
7. **Install Command:** `npm install` (default is fine).
8. **Output:** Next.js default (no change).

Do **not** click **Deploy** until you add **Environment Variables** (step 2). You can open **Environment Variables** on the same import screen before the first deploy.

---

## 2. Environment variables (copy from your local `.env`)

In Vercel → Project → **Settings** → **Environment Variables**, add each name/value. Use **Production** (and **Preview** if you want staging to work too).

**Required for a working app**

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Production DB for **runtime** queries. On **Supabase + Vercel**, prefer the **pooled** / transaction string (often port **6543**). |
| `DIRECT_URL` | **Required** for builds: Prisma runs `migrate deploy` via **direct** Postgres (`db.<project>.supabase.co`, port **5432**). Same user/password as `DATABASE_URL`. If you use only one non-pooled URL, set `DIRECT_URL` **equal** to `DATABASE_URL`. |
| `NEXTAUTH_URL` | Your live site URL, e.g. `https://galaxrx-marketplace.vercel.app` or your custom domain **with `https`**. Must match what users type in the browser. |
| `NEXTAUTH_SECRET` | Same long random secret you use locally (e.g. `openssl rand -base64 32`). |
| `AUTH_TRUST_HOST` | Set to `true` (matches `.env.example`). |

**Stripe (payments)**

| Variable | Notes |
|----------|--------|
| `STRIPE_SECRET_KEY` | Live **or** test key depending on what you want in production. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Matching publishable key. |
| `STRIPE_WEBHOOK_SECRET` | From Stripe **main** webhook endpoint (see §4). |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | From Stripe **Connect** webhook if you use it. |

**Email (Resend)**

| Variable | Notes |
|----------|--------|
| `RESEND_API_KEY` | From Resend dashboard. |
| `RESEND_FROM_EMAIL` | From address, e.g. `GalaxRX <noreply@yourdomain.com>`. Must be allowed in Resend (verified domain). |

**Uploads (if you use listing/logo upload)**

| Variable | Notes |
|----------|--------|
| `UPLOADTHING_SECRET` | |
| `UPLOADTHING_APP_ID` | |

**Optional / features**

Copy any other keys you use locally from `.env.example` (Australia Post, barcode API, register of pharmacies, PBS, Medipim, etc.). If missing, only those features break.

**Public env vars** (must be exposed to the browser — in Vercel tick **Expose to Browser** where applicable):

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_PLATFORM_EMAIL` (and any other `NEXT_PUBLIC_*` you use)

---

## 3. Prisma migrations on Vercel

Your `package.json` has `"postinstall": "prisma generate"` — good. That runs on Vercel install.

**Migrations** are **not** applied by `next build` alone. Set:

**Build Command:**

```bash
npx prisma migrate deploy && npm run build
```

- First deploy: applies all migrations in `prisma/migrations` to the **production** database. Prisma uses **`DIRECT_URL`** for migrations when set in `schema.prisma` (Supabase poolers often reject migration DDL without it).
- Ensure **`DATABASE_URL`** and **`DIRECT_URL`** are set **before** the first deploy, or the build will fail at `migrate deploy` or `prisma generate`.

If you prefer not to run migrations during build, run once from your PC against production (advanced):

```cmd
set DATABASE_URL=postgresql://...your-production-url...
npx prisma migrate deploy
```

Then use plain `npm run build` on Vercel — not recommended long-term; the combined build command is simpler.

---

## 4. After the first successful deploy

1. **Copy your production URL** (e.g. `https://xxx.vercel.app`).
2. **Stripe Dashboard** → **Developers** → **Webhooks** → add endpoint:
   - URL: `https://YOUR_DOMAIN/api/stripe/webhook`
   - Events: at least `payment_intent.succeeded`, `payment_intent.payment_failed`, and whatever else your `webhook/route.ts` handles.
   - Copy the **signing secret** → set `STRIPE_WEBHOOK_SECRET` in Vercel → **Redeploy** (or wait for next push).
3. **Connect webhook** (if used): separate endpoint for Connect events if your app expects `STRIPE_CONNECT_WEBHOOK_SECRET`.
4. **Redeploy** after changing env vars: **Deployments** → **⋯** on latest → **Redeploy**.

---

## 5. Custom domain (optional)

Vercel → Project → **Settings** → **Domains** → add `galaxrx.com.au` (or your domain) and follow DNS instructions.

Then update:

- `NEXTAUTH_URL` to `https://your-domain.com`
- Stripe webhook URL to use the same domain
- Any `NEXTAUTH_URL` / OAuth callback URLs in GitHub if you use GitHub OAuth (this app uses credentials; still keep `NEXTAUTH_URL` correct).

---

## 6. Cron job (`vercel.json`)

Your repo schedules `/api/admin/stripe-retry-failed` via `vercel.json`. **Hobby** only allows **once per day** (repo uses `0 2 * * *` — 02:00 UTC). On **Pro**, you can change it to e.g. every 10 minutes (`*/10 * * * *`). If something fails, check **Vercel → Project → Settings → Cron Jobs** and deployment logs.

---

## 7. Day-to-day

- Push to **`main`** on GitHub → Vercel **auto-deploys**.
- Change secrets only in **Vercel → Settings → Environment Variables**, then **Redeploy**.

---

## Quick checklist

- [ ] Import GitHub repo on Vercel  
- [ ] Set `DATABASE_URL` (pooled if Supabase serverless) and **`DIRECT_URL`** (direct `5432` for migrations)  
- [ ] Set `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_TRUST_HOST`  
- [ ] Set Stripe + Resend (+ Uploadthing if needed)  
- [ ] Build command: `npx prisma migrate deploy && npm run build`  
- [ ] Deploy  
- [ ] Add Stripe webhook URL + secret; redeploy  
- [ ] Open site and smoke-test login + one API route  

If a build fails, open the **Vercel build log** — the first red error line usually says whether it’s Prisma, missing env, or TypeScript.
