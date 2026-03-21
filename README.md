# GalaxRX Marketplace — Phase 1 MVP

B2B marketplace where licensed Australian pharmacies buy and sell surplus, short-dated, or hard-to-find stock.

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Auth:** NextAuth.js (email + password)
- **Files:** Uploadthing
- **Payments:** Stripe Connect
- **Email:** Resend

## Setup

1. **Clone / open** this folder and install dependencies:
   ```bash
   cd "F:\GalaxRX\GalaxRX Market Place"
   npm install
   ```

2. **Environment:** Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — Supabase PostgreSQL connection string
   - `NEXTAUTH_SECRET` — e.g. `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000` (dev)
   - Add Uploadthing, Stripe, Resend keys when you reach those sprints

3. **Database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Logo:** Place the GalaxRX logo at `public/logo.png` (used on landing, dashboard, emails, invoices).

5. **Run:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Build order (9 sprints)

- **Sprint 1** — Project foundation ✅
- **Sprint 2** — Auth & registration ✅ (register, login, pending, admin)
- **Sprint 3** — Listing flow ✅ (search, /sell, drugs API)
- **Sprint 4** — My Listings & repeat ✅
- **Sprint 5** — Browse & buy ✅ (listings, detail, clearance)
- Sprint 6 — Stripe payments (Connect, checkout, webhook)
- Sprint 7 — Wanted board (post form), orders, invoice PDF
- Sprint 8 — Messaging & reviews
- **Sprint 9** — Landing, admin, polish ✅

### Admin user

To access `/admin`, set a pharmacy's role to `ADMIN` in the database (e.g. Supabase SQL: `UPDATE "Pharmacy" SET role = 'ADMIN' WHERE email = 'your@email.com';`). Then sign in with that account.

## Design

- **Primary blue:** `#1A6FC4`
- **Accent green:** `#4BBF3C`
- **Fonts:** Sora (headings), Inter (body)

Core rule: **List a product in under 20 seconds** (barcode scan → publish).
