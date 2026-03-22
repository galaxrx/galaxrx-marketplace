# Debugging “Something went wrong” / Server Components errors on Vercel

In **production**, Next.js often hides the real error text and shows a generic message plus a **`digest`** (reference id). That is normal — it avoids leaking stack traces or secrets to browsers.

## Build log vs runtime log

- **Build** log (what you see after “Compiled successfully”, route table, “Build Completed”) only proves **`next build`** worked. It does **not** show errors when a user opens `/account`.
- To debug **“Something went wrong”** in the browser, open **Runtime** logs: **Project → your deployment → Logs** and filter to **Runtime** / **Functions** / **Serverless** (wording varies), then reproduce the page load and look for a **red** stack trace or `Error:` line.

## 1. Read the error on Vercel

1. Open **[vercel.com](https://vercel.com)** → your **Project**.
2. Go to **Deployments** → open the deployment that failed (or the latest **Production** build).
3. Open **Runtime** / **Functions** logs — **not** only the build output from the deploy summary.
4. Reproduce the issue (reload **My Account** or the route that breaks), then watch for a **red** error line — it usually includes the real message (e.g. Prisma `P1001`, missing column, `NEXTAUTH_SECRET`, etc.).
5. If you have the **digest** from the error page, search the logs around the same time; some setups log it next to the failure.

CLI (optional):

```bash
npx vercel logs <your-deployment-url>
```

## 2. Common causes after deploy

| Symptom / area | What to check |
|----------------|---------------|
| **`MaxClientsInSessionMode: max clients reached`** | **`DATABASE_URL`** must use **Transaction** pooler (**`6543`**) + **`pgbouncer=true&connection_limit=1`**. Do not use Session (`5432`) for the **app** URL. (Build still needs **`DIRECT_URL`** = Session `5432` for migrations only — see **[VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md)**.) |
| **Vercel build stuck after “Datasource … :6543”** | **`prisma migrate deploy`** hanging on the transaction pooler. **Fix:** add **`DIRECT_URL`** in Vercel (Session pooler **`5432`**, same host/user/password) and redeploy; repo **`schema.prisma`** uses `directUrl` for migrations. |
| **Right after sign-in, generic error** | **Pending ↔ dashboard redirect loop** if `isVerified` was ever missing on the JWT (fixed in app: `/pending` only sends verified users to `/dashboard` with `=== true`). **Sign out and sign in again** after deploy. |
| **Any dashboard page** | **`DATABASE_URL`** in Vercel (Supabase **pooler** URI, correct password encoding). See [VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md). |
| **After a code deploy** | **Migrations**: build should run `prisma migrate deploy`. If the DB is behind the schema, Prisma throws on missing tables/columns. |
| **Auth / redirect loops** | **`NEXTAUTH_URL`** must be your live `https://…` URL. **`NEXTAUTH_SECRET`** must be set and stable. |
| **My Account / orders** | DB reachable; `Order` / `Pharmacy` data intact. The account page uses safe date/money formatting so **invalid `createdAt` or missing buyer/seller** does not crash the whole route. |
| **Some listing images broken** | Often **UploadThing `*.ufs.sh` URLs** (add to `next.config.mjs` `images.remotePatterns`) or **third-party product image hosts** not allowlisted — the app falls back to a plain `<img>` for unknown HTTPS hosts and shows “Image unavailable” on 404. |

## 3. Reproduce locally with production-like settings

```bash
cd "F:\GalaxRX\GalaxRX Market Place"
npm run build
npm run start
```

Use a copy of **production** env vars in `.env.local` (never commit them). Errors in this mode are often **more verbose** than on Vercel’s edge HTML.

## 4. Code change: dashboard pharmacy lookup

The dashboard layout loads pharmacy display data for the header. That path previously used **`unstable_cache`**, which can be flaky with **`force-dynamic`** on serverless. It now uses React **`cache()`** for per-request deduplication only (`lib/pharmacy-cache.ts`). If errors persist, the logs above still point to the true cause (usually DB or schema).
