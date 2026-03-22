# Paid / “Pro” services & deploying to GitHub + Vercel

This note explains **what to upgrade** when you outgrow free tiers (database, UploadThing, barcode API, NSW pharmacist verification) and **exactly what to do next** so production keeps working.

---

## How this project expects you to work (two paths)

**Path A — You only changed keys, plans, or URLs (no code edits)**  
You upgrade at the vendor site, then copy values into Vercel and redeploy. **Do not** put secrets in Git.

1. Complete the upgrade or get the new key at the vendor (sections 1–4 below).  
2. Open **[vercel.com](https://vercel.com)** → select the **GalaxRX** (or your) **Project**.  
3. Go to **Settings** → **Environment Variables**.  
4. Find the variable name (e.g. `DATABASE_URL`) → **Edit** (or **Add**), paste the new value, choose **Production** (and **Preview** if you use it) → **Save**.  
5. Go to **Deployments** → open the **⋯** menu on the latest production deployment → **Redeploy** → confirm. Wait until status is **Ready**.  
6. Smoke-test the site (login, upload, barcode, registration if you changed those keys).

**Path B — You changed code in this repo**  
Vercel rebuilds when you push to the branch connected to Production (usually `main`).

1. Save all files in your editor.  
2. Open a terminal and go to the project folder (see **Section 5** for exact commands).  
3. `git add`, `git commit`, `git push origin main`.  
4. Open Vercel → **Deployments** and wait for the new deployment from your commit to show **Ready**.  
5. If the change also needs new env vars, do **Path A steps 3–6** after pushing.

---

## 1. Database (Supabase — Pro / larger tier)

**Why upgrade:** more compute, storage, connections, backups, optional IPv4 add-ons, fewer free-tier pauses.

**Step by step**

1. Go to **[supabase.com/dashboard](https://supabase.com/dashboard)** and sign in.  
2. Click your **project** for GalaxRX.  
3. Open **Project Settings** (gear) → **Billing** or **Subscription** / **Upgrade** (wording varies).  
4. Select the plan you want and complete checkout.  
5. Still in Supabase: **Project Settings** → **Database** → confirm your **connection string** / **pooler** URI if anything changed after upgrade.  
6. If Supabase made you **reset the database password**, build a new connection URI (pooler host, user, password, `sslmode=require`) — see **[VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)** for pooler vs direct.  
7. In **Vercel** → **Settings** → **Environment Variables** → set or update **`DATABASE_URL`** with that full URI → **Save**.  
8. **Deployments** → **⋯** → **Redeploy** (Production) → wait for **Ready**.  
9. Optional: run through your app (login, any DB-heavy page) to confirm no `P1001` / connection errors.

**GitHub:** only needed if you changed `prisma/schema.prisma` or application code — then use **Section 5**.

---

## 2. UploadThing (paid storage / regions)

**Why upgrade:** higher storage limits, optional regions, stricter access.

**Step by step**

1. Go to **[uploadthing.com](https://uploadthing.com)** and sign in.  
2. Open your **team** → **Billing** or **Plans** → upgrade and pay if required.  
3. Open your **app** (or create one if you start fresh).  
4. Find **API keys** / **Environment variables** (or **.env**) for **SDK v7** → copy **`UPLOADTHING_TOKEN`** (single token string).  
5. In **Vercel** → **Settings** → **Environment Variables** → add or edit **`UPLOADTHING_TOKEN`** → paste value **without** extra quotes → **Save** for **Production**.  
6. In **UploadThing** dashboard → your app → **Allowed origins / URLs** (or similar) → add your live site, e.g. `https://your-project.vercel.app` and your custom domain if you use one.  
7. **Vercel** → **Deployments** → **⋯** → **Redeploy** → **Ready**.  
8. Test: upload an image or file where the app uses UploadThing.

**GitHub:** only if you changed upload API routes or client code.

---

## 3. Barcode Lookup API (paid quota)

**Why upgrade:** more lookups per day/month than the free API allows.

**Step by step**

1. Sign in at the vendor you use (commonly **[barcodelookup.com/api](https://www.barcodelookup.com/api)** — use whatever account you already registered with).  
2. Open **account / billing / API plan** → subscribe or upgrade to a paid tier.  
3. Copy the **API key** from their dashboard.  
4. In **Vercel** → **Settings** → **Environment Variables** → set **`BARCODELOOKUP_API_KEY`** to that key → **Save** (Production).  
5. **Deployments** → **⋯** → **Redeploy** → **Ready**.  
6. Test: scan or enter a barcode on a screen that calls the API.

**GitHub:** not required for key rotation alone. Env name must match **`.env.example`**: `BARCODELOOKUP_API_KEY`.

---

## 4. Register of Pharmacists (API NSW)

**Why upgrade:** production usage, quotas, or contract terms are managed in **API NSW** / your NSW app registration — follow their portal.

**Step by step**

1. Go to **[api.nsw.gov.au](https://api.nsw.gov.au/)** (or the NSW portal where you registered the app).  
2. Sign in → **My apps** / **Subscriptions** (or equivalent).  
3. Request **production** access, higher limits, or paid tier **as their docs require** for the Register of Pharmacists product.  
4. When you receive **new** base URL, consumer key, consumer secret, or auth details, open **Vercel** → **Settings** → **Environment Variables**.  
5. Update only the variables your app uses (see **`.env.example`**):  
   - **`REGISTER_OF_PHARMACIES_API_BASE_URL`**  
   - **`REGISTER_OF_PHARMACIES_API_KEY`**  
   - **`REGISTER_OF_PHARMACIES_API_SECRET`**  
   - or **`REGISTER_OF_PHARMACIES_AUTH_HEADER`** if you use Basic auth instead of key+secret  
6. **Save** each change (Production).  
7. **Deployments** → **⋯** → **Redeploy** → **Ready**.  
8. Test: pharmacy registration or any flow that calls the NSW register API.

**GitHub:** only if you change `lib/register-of-pharmacies-api.ts` or related routes.

---

## 5. Push **code** changes to GitHub (step by step)

Use this when you edited files in the repo (not only Vercel env vars).

1. Open **Command Prompt** or **PowerShell** (or **Git Bash** if `git commit` fails on Windows — see **[PUSH-TO-GITHUB.md](./PUSH-TO-GITHUB.md)**).  
2. Change to the project folder:  
   `cd /d F:\GalaxRX\GalaxRX Market Place`  
3. See what changed:  
   `git status`  
4. Stage everything you want in this commit:  
   `git add -A`  
5. Commit with a short message:  
   `git commit -m "Short description of what you changed"`  
6. Push to GitHub (default branch is usually `main`):  
   `git push origin main`  
7. Open **[vercel.com](https://vercel.com)** → your project → **Deployments** → confirm the new deployment from that commit is **Building** then **Ready**.

**Never commit** `.env` or real API keys — only `.env.example` patterns belong in Git.

Full detail and Windows Git quirks: **[PUSH-TO-GITHUB.md](./PUSH-TO-GITHUB.md)**.

---

## 6. Get changes onto **Vercel** (step by step)

**If you changed code (pushed to GitHub)**

1. Vercel → **Deployments**.  
2. Find the deployment tied to your latest **commit** on `main` (or your production branch).  
3. Wait until it shows **Ready**; if **Failed**, open the build log and fix errors, then push again.

**If you only changed environment variables**

1. Vercel → your **Project** → **Settings** → **Environment Variables**.  
2. Add or edit variables → **Save**.  
3. Vercel does **not** always restart the running app with new env values until you redeploy.  
4. Go to **Deployments** → click **⋯** on the **latest Production** deployment → **Redeploy** → confirm.  
5. Wait for **Ready**, then test.

First-time project linking and full env list: **[VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)** and **[PRE-DEPLOYMENT-CHECKLIST.md](./PRE-DEPLOYMENT-CHECKLIST.md)**.

---

## Quick checklist

- [ ] Upgraded or subscribed at **Supabase**, **UploadThing**, barcode vendor, **API NSW** as needed.  
- [ ] Copied new values into **Vercel → Settings → Environment Variables** (Production).  
- [ ] **Redeployed** Production after any env-only change.  
- [ ] **`git push`** after any code change; confirmed deployment **Ready** on Vercel.

---

*Vendor screens and plan names change; always confirm limits and pricing on the official sites.*
