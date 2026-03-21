# Master Report & Audit: Price Insight, Negotiate Price, and Payments

**Purpose:** Single reference for review, audit, and improvement of the price insight, negotiation, and payment flows. Intended for ChatGPT or other reviewers.

**Project:** GalaxRX Marketplace (Next.js 14, Prisma, Stripe, PostgreSQL/Supabase)

---

## 1. Overview

Three main flows are documented:

| Flow | Description |
|------|--------------|
| **Price Insight** | Mock price-intelligence service suggests listing/offer prices for sellers and buyers. Uses `lib/mock-price-intelligence.ts` and two API routes. UI: `PriceInsightPanel`; respects listing `priceType` (FIXED = no suggestion for seller, buyer sees "Price is fixed"). |
| **Negotiate Price** | Buyer sends a proposed price per pack; seller accepts or rejects from dashboard. Accepted offers create in-app messages and appear on buyer dashboard as "Payment — Accepted offers" with Buy Now. |
| **Payments** | Stripe PaymentIntent created via `create-payment-intent`. For listings, if the current user (buyer) has an **ACCEPTED** `ListingNegotiation`, the **negotiated price** is used instead of listing list price. Listing page and Buy Now modal show agreed price only to that buyer. |

---

## 2. Price Insight

### 2.1 Mock service

- **File:** `lib/mock-price-intelligence.ts`
- **Export:** `IS_MOCK_PRICE_INTELLIGENCE = true`
- **Functions:**
  - `getMockPriceIntelligence({ productName, listingPrice, listingId, expiryDate, allActiveListings })` — for a **listing** (seller/buyer view). Returns `PriceIntelligenceResult`: `suggestedSellerPrice`, `suggestedBuyerOffer`, `sellerReasoning`, `buyerReasoning`, `confidence`, `marketListings`, `supplierData`.
  - `getMockPriceIntelligenceForProduct({ productName, referencePrice?, allActiveListings })` — for **wanted** items (product name only, no listing id).
- **Logic (summary):**
  - **Seller suggestion:** Base from supplier RRP or market average; expiry discount (e.g. &lt;30d = 40% off); undercut lowest market by ~5–10%; floor at wholesale if known; round to $0.50.
  - **Buyer suggestion:** Seller-favorable; baseline ~5% discount; higher discount only for short expiry / many competitors.
- **Data:** `MOCK_SUPPLIER_DATA` keyed by product name fragments (e.g. `"blackmores"`, `"paracetamol 500mg"`). Real production would replace this with a supplier API.

### 2.2 APIs

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `app/api/listings/[id]/price-intelligence/route.ts` | GET | Required | Returns price intelligence for a specific listing. Loads listing + other active listings by `productName` (contains, case-insensitive), calls `getMockPriceIntelligence`, returns JSON. Sets header `X-Price-Intelligence-Mock: true`. |
| `app/api/wanted/price-intelligence/route.ts` | GET | Required | Query: `productName`, optional `referencePrice`. Returns intelligence for a product name (wanted flow). Uses `getMockPriceIntelligenceForProduct`. Same mock header. |

### 2.3 UI: PriceInsightPanel

- **File:** `components/price-intelligence/PriceInsightPanel.tsx`
- **Props:** `listingId?`, `productName?`, `currentPrice`, `viewAs: "seller" | "buyer"`, `isOwner?`, `priceType?: "FIXED" | "NEGOTIABLE"`, `referencePrice?`, `overlay?`, `daysUntilExpiry?`, `buttonLabel?`
- **Behavior:**
  - **Seller + FIXED:** No suggested price, no "Apply this price"; message "You've set a fixed price — no price suggestion." Market table still shown.
  - **Buyer + FIXED:** No API call; panel shows "The price is fixed. Pay the listed price."
  - **Seller + NEGOTIABLE:** Fetches from listing price-intelligence API; shows suggested price, reasoning, market table; if `isOwner` and `listingId`, shows "Apply this price" (PUT listing with new price).
  - **Buyer + NEGOTIABLE:** Fetches listing or wanted API; shows suggested offer, reasoning, market table.
- **Used in:** `ListingDetailPriceBox`, `ListingCard`, `app/admin/listings/page.tsx`, `WantedItemRow`, `MakeOfferModal`.

### 2.4 Listing priceType

- **Schema:** `Listing.priceType` (String, default `"NEGOTIABLE"`). Values: `"FIXED"` | `"NEGOTIABLE"`.
- **Create/update:** `POST /api/listings`, `PUT /api/listings/[id]` require/allow `priceType`.
- **Sell form:** `components/sell/SellPageClient.tsx` — mandatory radio Fixed/Negotiable; sent on create and update.
- **Bulk:** `app/api/listings/bulk/route.ts` and `components/sell/BulkUploadHelper.tsx` — `priceType` in schema and CSV; template `public/listings-bulk-template.csv` has column `priceType`.
- **Listing detail:** "Negotiate with Seller" button only when `listing.priceType !== "FIXED"` (`ListingDetailPriceBox.tsx`).

---

## 3. Negotiate Price

### 3.1 Data model

- **Prisma:** `ListingNegotiation` in `prisma/schema.prisma`
  - `id`, `listingId`, `buyerId`, `proposedPricePerPack`, `message?`, `status` (default `"PENDING"`: `PENDING` | `ACCEPTED` | `REJECTED`), `createdAt`, `updatedAt`
  - Relations: `listing` (Listing), `buyer` (Pharmacy)

### 3.1.1 Uniqueness and invariants

- **PENDING:** At most one PENDING negotiation per (listingId, buyerId). Enforced in `POST /api/listings/[id]/negotiate`: creation is blocked if a PENDING already exists for that pair.
- **ACCEPTED:** At most one ACCEPTED negotiation per (listingId, buyerId) at any time. There is no DB unique constraint; enforcement is application-level:
  - When the seller **accepts** an offer (PATCH with `action: "accept"`), any other ACCEPTED negotiation for the same listing+buyer is first set to REJECTED (superseded), then the current negotiation is set to ACCEPTED. Thus only one ACCEPTED per listing+buyer exists after each accept.
- **Lookup rule:** Where the app needs “the” ACCEPTED negotiation for a listing+buyer (listing page, create-payment-intent), it uses `findFirst` with `orderBy: { updatedAt: 'desc' }` so the chosen row is deterministic (most recently accepted). With the supersede-on-accept behaviour above, there will only be one ACCEPTED anyway; the orderBy remains as a safe tie-breaker for legacy or edge cases.

### 3.2 APIs

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `app/api/listings/[id]/negotiate/route.ts` | POST | Buyer | Body: `{ proposedPricePerPack, message? }`. Validates listing active, `priceType !== "FIXED"`, buyer ≠ seller, no existing PENDING for same listing+buyer. Creates `ListingNegotiation` (PENDING), creates in-app Message to seller with link to dashboard. Returns `{ id, message }`. |
| `app/api/listings/[id]/negotiations/[negotiationId]/route.ts` | PATCH | Seller | Body: `{ action: "accept" \| "reject" }`. Validates negotiation exists, listing belongs to seller, status PENDING. On **accept**: supersedes any other ACCEPTED for same listing+buyer (set to REJECTED), then sets this negotiation to ACCEPTED. On reject: sets to REJECTED. Creates Message to buyer (accept: "agreed price will apply at checkout" + link; reject: "buy at listed price" + link). |
| `app/api/account/negotiations/route.ts` | GET | Seller | Returns PENDING negotiations where `listing.pharmacyId === session.user.id` (seller's incoming offers). Used by dashboard "Price offers (negotiations)". |
| `app/api/account/accepted-offers/route.ts` | GET | Buyer | Returns ACCEPTED negotiations where `buyerId === session.user.id`. Includes listing (id, productName, pricePerPack, quantityPacks, isActive, images). Used by dashboard "Payment — Accepted offers". |

### 3.3 UI

- **Negotiate button/modal:** `ListingDetailPriceBox.tsx` embeds a "Negotiate with Seller" button (only if `priceType !== "FIXED"`) and modal to submit `proposedPricePerPack` + message; POST to `POST /api/listings/[id]/negotiate`.
- **Seller dashboard:** `app/(dashboard)/dashboard/_components/DashboardNegotiations.tsx` — fetches `GET /api/account/negotiations`, lists PENDING offers with Accept/Reject; PATCH to `.../negotiations/[negotiationId]`.
- **Buyer dashboard:** `app/(dashboard)/dashboard/_components/DashboardAcceptedOffers.tsx` — fetches `GET /api/account/accepted-offers`, shows cards (photo, name, agreed price, "Buy Now" link to listing).

### 3.4 Accepted price on listing page

- **Listing page (server):** `app/listings/[id]/page.tsx` — if session user is not the seller, looks up the ACCEPTED negotiation for this listing + this buyer (orderBy `updatedAt` desc for a deterministic single result); if found, passes `acceptedPricePerPack` to view.
- **ListingDetailView** → **ListingDetailClient** → **ListingDetailPriceBox** and **BuyNowModal** receive `acceptedPricePerPack`.
- **ListingDetailPriceBox:** Uses `unitExGst = acceptedPricePerPack ?? listing.pricePerPack` for display and quote; shows "✓ Your agreed price" when set.
- **BuyNowModal:** Uses `unitPriceExGst = acceptedPricePerPack ?? listing.pricePerPack` for quote and detail row; label "Agreed price" when set.

---

## 4. Payments

### 4.1 Pricing library

- **File:** `lib/pricing.ts`
- **Main:** `getListingQuoteResult(input: ListingQuoteInput)` → `ListingQuoteResult`. Input: `unitPriceExGst`, `quantity`, `deliveryFeeExGst?`, `isGstFree?`. If `isGstFree === null` (REVIEW_REQUIRED), returns `allowed: false` and blocks checkout; otherwise returns `allowed: true` and full quote (gross, GST, platform fee, totalCharged, etc.). Used by both UI and create-payment-intent so amounts never diverge.

### 4.2 Create PaymentIntent (listing flow)

- **File:** `app/api/stripe/create-payment-intent/route.ts`
- **Listing branch (relevant excerpt):**
  - Reads `listingId`, `quantity`, optional `deliveryFee` override, `idempotencyKey` from body; validates session (buyer), listing exists and is active, quantity ≤ available.
  - **Negotiated price:** Looks up the ACCEPTED `ListingNegotiation` for `listingId` + buyer (orderBy `updatedAt` desc for deterministic single result). If found, `unitPriceExGst = acceptedNegotiation.proposedPricePerPack`, else `listing.pricePerPack`.
  - Builds quote via `getListingQuoteResult({ unitPriceExGst, quantity, deliveryFeeExGst, isGstFree: listing.isGstFree })`. On `allowed: false` returns 403.
  - Creates/updates `PaymentAttempt`, creates Stripe PaymentIntent with destination charge, returns `clientSecret`.

### 4.3 UI payment flow

- **BuyNowModal** (`components/listings/BuyNowModal.tsx`): Receives `listing`, `quantity`, `acceptedPricePerPack?`. Uses `unitPriceExGst = acceptedPricePerPack ?? listing.pricePerPack` for `getListingQuoteResult` and all displayed totals. POSTs to create-payment-intent with `listingId`, `quantity`, `deliveryFee`; backend applies negotiated price for that buyer. Renders Stripe Elements and confirms payment.

### 4.4 Order creation

- Orders are created by Stripe webhook (payment success), not by the create-payment-intent route. Order records `unitPrice` at time of purchase; when the flow used an accepted negotiation, the PaymentIntent amount already reflects the negotiated price, so the webhook records the correct amount.

---

## 5. Data Models (Prisma)

```prisma
model Listing {
  // ...
  pricePerPack     Float
  priceType        String   @default("NEGOTIABLE")  // FIXED | NEGOTIABLE
  // ...
  negotiations     ListingNegotiation[]
}

model ListingNegotiation {
  id                    String   @id @default(cuid())
  listingId             String
  buyerId               String
  proposedPricePerPack  Float
  message               String?  @db.Text
  status                String   @default("PENDING")  // PENDING | ACCEPTED | REJECTED
  createdAt             DateTime @default(now())
  updatedAt             DateTime @default(now()) @updatedAt
  listing               Listing  @relation(...)
  buyer                 Pharmacy @relation(...)
}
```

---

## 6. File Index

| Path | Role |
|------|------|
| `lib/mock-price-intelligence.ts` | Mock price intelligence; seller/buyer suggestions; supplier + market logic |
| `lib/pricing.ts` | Listing quote calculation; tax classification; used by UI and create-payment-intent |
| `app/api/listings/[id]/price-intelligence/route.ts` | GET price insight for a listing |
| `app/api/wanted/price-intelligence/route.ts` | GET price insight for product name (wanted) |
| `app/api/listings/[id]/negotiate/route.ts` | POST create buyer offer (negotiation) |
| `app/api/listings/[id]/negotiations/[negotiationId]/route.ts` | PATCH accept/reject offer |
| `app/api/account/negotiations/route.ts` | GET seller's PENDING negotiations |
| `app/api/account/accepted-offers/route.ts` | GET buyer's ACCEPTED negotiations (for dashboard) |
| `app/api/stripe/create-payment-intent/route.ts` | POST create PaymentIntent; uses accepted negotiation price for listing buyer |
| `app/api/listings/route.ts` | POST/PUT listing; includes priceType |
| `app/api/listings/[id]/route.ts` | GET/PUT listing; priceType in select/allow |
| `app/api/listings/bulk/route.ts` | POST bulk create; priceType in schema and create payload |
| `app/listings/[id]/page.tsx` | Server: fetches accepted negotiation for current buyer; passes acceptedPricePerPack |
| `components/price-intelligence/PriceInsightPanel.tsx` | UI: price insight overlay; fixed/negotiable and seller/buyer behavior |
| `components/listings/ListingDetailPriceBox.tsx` | Listing price box; agreed price badge; negotiate button; PriceInsightPanel |
| `components/listings/ListingDetailClient.tsx` | Wires listing, acceptedPricePerPack, to PriceBox and BuyNowModal |
| `components/listings/ListingDetailView.tsx` | Layout; passes acceptedPricePerPack to client |
| `components/listings/BuyNowModal.tsx` | Checkout modal; uses acceptedPricePerPack for quote and display |
| `components/listings/ListingCard.tsx` | Buy grid card; PriceInsightPanel with priceType |
| `components/sell/SellPageClient.tsx` | Sell form; priceType mandatory; create/update payload |
| `components/sell/BulkUploadHelper.tsx` | Bulk CSV; priceType column and parse |
| `app/(dashboard)/dashboard/_components/DashboardNegotiations.tsx` | Seller: list PENDING offers; accept/reject |
| `app/(dashboard)/dashboard/_components/DashboardAcceptedOffers.tsx` | Buyer: list ACCEPTED offers; photo, name, agreed price, Buy Now |
| `app/admin/listings/page.tsx` | Admin table; PriceInsightPanel with priceType |
| `prisma/schema.prisma` | Listing.priceType; ListingNegotiation model |
| `public/listings-bulk-template.csv` | CSV template with priceType column |

---

## 7. Request to ChatGPT (or Reviewer)

Please:

1. **Review** the above flows for correctness and consistency:
   - Price insight: mock data, API responses, and UI behavior for FIXED vs NEGOTIABLE and seller vs buyer.
   - Negotiation: create offer → seller accept/reject → messages and dashboard for both sides; accepted offer only visible to that buyer on listing and at checkout.
   - Payments: create-payment-intent use of accepted negotiation price; alignment of UI quote (ListingDetailPriceBox, BuyNowModal) with the amount actually charged.

2. **Audit** for security and data integrity:
   - That negotiated price is applied only for the buyer who has the ACCEPTED negotiation (no leakage to other users).
   - That listing create/update and bulk flows correctly enforce and persist priceType.
   - That PaymentIntent amount and order records are consistent when an accepted offer is used.

3. **Suggest improvements** for:
   - Code structure (e.g. shared types, validation, error messages).
   - Edge cases (e.g. listing deactivated after accept; multiple accepted negotiations; idempotency).
   - Performance (e.g. extra queries on listing page for accepted price).
   - UX (e.g. clearer labels, handling of expired or inactive listings in accepted-offers).
   - Replaceability of mock price intelligence with a real supplier API (interfaces, env flags).

Respond with a concise audit report and a prioritized list of recommended changes (with file paths and, where helpful, code-level suggestions).
