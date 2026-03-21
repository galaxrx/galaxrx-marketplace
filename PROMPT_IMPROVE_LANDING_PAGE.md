# Prompt: Improve the GalaxRX Landing Page (Beginning / Hero)

Use this prompt when asking Claude (or another AI) to improve the **beginning of the webpage** — the landing page, especially the hero section and first screen.

---

## Your task

Improve the **landing page** of the GalaxRX marketplace app. Focus on the **beginning of the page**: header, hero section, trust strip, and primary CTAs. You may also suggest refinements to the sections immediately below (How it works, Why GalaxRX) if they affect the “first impression.” Keep the same tech stack, design system, and business message; improve clarity, conversion, visual hierarchy, and modern best practices.

---

## Code context

### Where the landing page lives

- **File:** `app/page.tsx`  
- **Route:** `/` (root). This is a **Next.js 14 App Router** page component (React Server Component by default).  
- **Layout:** `app/layout.tsx` wraps all pages with fonts (Sora for headings, Inter for body), metadata, SessionProvider, and Toaster.

### Tech stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Fonts:** Sora (headings), Inter (body), loaded in `app/layout.tsx`
- **Image:** Next.js `Image` for the logo at `public/logo.png`

### Structure of `app/page.tsx`

1. **Constants at top (no backend):**
   - `STAR_PATH` — SVG path for a 5-point star (floating decoration).
   - `STARS` — array of `{ top, left, size, delay, color }` for positioning and animating stars in the hero.
   - `TRUST_ITEMS` — array of `{ icon, label }` for the three hero trust bullets: “Verified pharmacies only”, “Stripe-secured payments”, “List in under 20 seconds”.
   - `WHY_CARDS` — array of `{ icon, title, desc }` for the “Why GalaxRX” section (four cards).

2. **Single default export:** `HomePage()` returns one large JSX tree:
   - **Header:** Logo (Link to `/`), “Browse listings” (Link to `/listings`), “Sign in” (Link to `/login`), “Join free →” (Link to `/register`).
   - **Hero:** Dark navy background, floating stars (using `STARS` + `animate-float`), gold glow blobs (`blob-gold-1`, `blob-gold-2`), trust badge (“Trusted by independent pharmacies across Australia”), headline “The Smarter Way for Pharmacies to **Trade**” (word “Trade” in gold), subcopy, two CTAs (“Join free →”, “Browse listings →”), then the three `TRUST_ITEMS` as small labels.
   - **How it works:** Three steps (Scan/search → Set price & expiry → Trade securely) in a horizontal layout with arrows on desktop.
   - **Why GalaxRX:** Four cards from `WHY_CARDS`.
   - **Stats bar:** 10s, 3.5%, 24h with short labels.
   - **CTA band:** “Ready to start trading?” + “Join free — no subscription needed →”.
   - **Footer:** Logo, tagline, Platform links (Browse listings, Register, Sign in), Legal (Terms, Privacy, Contact), copyright.

All links use Next.js `Link`; no client-side state or hooks on this page.

### Design tokens and global styles

- **Colors (Tailwind):**  
  - `gold` = `#C9A84C`, `gold-muted` = `#A18241`  
  - `mid-navy` = `#0F2035`, `deep-navy` = `#091422`, footer = `#070F18`  
  - Backgrounds in the hero are hardcoded `#0D1B2A` (dark navy).  
- **Global CSS (`app/globals.css`):**  
  - `animate-float` (floating stars), `blob-gold-1` / `blob-gold-2` (gold glow blobs), `gold-divider`, `gold-bar`, `animate-fade-in-up` + `animation-delay-*` for staggered hero content.  
- **README design rule:** Primary blue `#1A6FC4`, accent green `#4BBF3C` are noted but the landing page currently uses navy + gold only; you can align or keep hero as-is.

Keep the existing Tailwind theme and CSS classes where possible; extend or add only as needed for your improvements.

---

## Business context

- **Product:** GalaxRX is a **B2B marketplace** where **licensed Australian pharmacies** buy and sell **surplus, short-dated, or hard-to-find** pharmacy stock.
- **Audience:** Independent pharmacies (and similar licensed traders) in Australia — not consumers.
- **Value proposition:** “The smarter way for pharmacies to trade” — list surplus in seconds (e.g. barcode scan), find what you need, trade only with **verified** pharmacies, with **Stripe-secured** payments and **no subscription** (3.5% fee only).
- **Trust:** “Trusted by independent pharmacies across Australia”; verification within ~24h; verified pharmacies only; Stripe for payments.

The beginning of the webpage must speak to **pharmacy owners/staff**, stress **trust, speed, and low friction**, and drive **registration** and/or **browsing listings**.

---

## Most important app features (to reflect on the landing page)

1. **Verified pharmacies only** — Every pharmacy is manually verified; B2B only, no consumers. Trust and safety are central.
2. **List in under 20 seconds** — Barcode scan (or search) → auto-fill → set price & expiry → publish. Core UX promise.
3. **Browse & buy listings** — Search/filter listings, view details, buy from other verified pharmacies.
4. **Sell / My Listings** — List surplus stock, manage and repeat listings easily.
5. **Stripe-secured payments** — Buyer funds protected until delivery; 3.5% fee only; no subscription.
6. **Expiry / clearance board** — Short-dated stock can be listed and discovered (recover value before expiry).
7. **Wanted board** — Pharmacies can post “wanted” requests; others make offers (with optional SOS for urgent needs).
8. **Orders & invoices** — Order flow and invoice PDF for record-keeping and compliance.
9. **Messaging** — Communication between buyers and sellers.
10. **Community forum** — Topics for independent pharmacies (e.g. surplus, tools, benchmarks).

The hero and first screen should emphasize: **verification**, **speed of listing**, **Stripe security**, **no subscription**, and **clear CTAs** (Join free, Browse listings).

---

## What to improve (guidance for the AI)

- **Clarity and hierarchy:** Make the value proposition and primary CTAs unmissable; improve scanability and reading order.
- **Conversion:** Strengthen trust (e.g. verification, Stripe, “no subscription”) and reduce friction in the first screen.
- **Visual design:** Refine spacing, typography scale, contrast, and mobile behaviour while keeping the navy + gold identity.
- **Copy:** Tighten headline and subcopy; ensure “10 seconds” / “under 20 seconds” and “verified pharmacies” are clear and consistent.
- **Accessibility and semantics:** Ensure headings order (e.g. one h1), link labels, and ARIA where helpful.
- **Performance and structure:** Keep the page as a Server Component; avoid unnecessary client JS; keep using `next/image` for the logo.

Return concrete edits (or a full revised `app/page.tsx` and any changes to `app/globals.css` or `tailwind.config.ts`) so the developer can apply them directly.
