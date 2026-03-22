# Debugging “Something went wrong” / Server Components errors on Vercel

In **production**, Next.js often hides the real error text and shows a generic message plus a **`digest`** (reference id). That is normal — it avoids leaking stack traces or secrets to browsers.

## 1. Read the error on Vercel

1. Open **[vercel.com](https://vercel.com)** → your **Project**.
2. Go to **Deployments** → open the deployment that failed (or the latest **Production** build).
3. Open **Logs** (or **Runtime Logs** / **Functions** depending on UI).
4. Reproduce the issue (reload **My Account** or the route that breaks), then watch for a **red** error line — it usually includes the real message (e.g. Prisma `P1001`, missing column, `NEXTAUTH_SECRET`, etc.).
5. If you have the **digest** from the error page, search the logs around the same time; some setups log it next to the failure.

CLI (optional):

```bash
npx vercel logs <your-deployment-url>
```

## 2. Common causes after deploy

| Symptom / area | What to check |
|----------------|---------------|
| **Any dashboard page** | **`DATABASE_URL`** in Vercel (Supabase **pooler** URI, correct password encoding). See [VERCEL-DEPLOY.md](./VERCEL-DEPLOY.md). |
| **After a code deploy** | **Migrations**: build should run `prisma migrate deploy`. If the DB is behind the schema, Prisma throws on missing tables/columns. |
| **Auth / redirect loops** | **`NEXTAUTH_URL`** must be your live `https://…` URL. **`NEXTAUTH_SECRET`** must be set and stable. |
| **My Account / orders** | DB reachable; `Order` / `Pharmacy` data intact (no manual DB edits breaking relations). |

## 3. Reproduce locally with production-like settings

```bash
cd "F:\GalaxRX\GalaxRX Market Place"
npm run build
npm run start
```

Use a copy of **production** env vars in `.env.local` (never commit them). Errors in this mode are often **more verbose** than on Vercel’s edge HTML.

## 4. Code change: dashboard pharmacy lookup

The dashboard layout loads pharmacy display data for the header. That path previously used **`unstable_cache`**, which can be flaky with **`force-dynamic`** on serverless. It now uses React **`cache()`** for per-request deduplication only (`lib/pharmacy-cache.ts`). If errors persist, the logs above still point to the true cause (usually DB or schema).
