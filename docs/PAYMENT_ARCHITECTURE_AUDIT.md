# GalaxRX Payment Architecture Audit & Target Design

## SECTION 1 — Codebase Audit

### 1.1 Payment Architecture in Use

| Finding | Location | Detail |
|--------|----------|--------|
| **Destination charges** | `app/api/stripe/create-payment-intent/route.ts` | PaymentIntent created on **platform** Stripe account with `transfer_data.destination: seller.stripeAccountId` and `application_fee_amount`. Charge is on platform; funds transferred to connected account. |
| **No idempotency key** | Same file | `stripe.paymentIntents.create()` called without `idempotencyKey`. Retries can create multiple PIs for same checkout. |
| **No payment attempt / quote record** | — | No DB record before PaymentIntent creation; no server-generated idempotency key. |
| **GST hard-coded 10%** | `lib/stripe.ts`, create-payment-intent, webhook, orders | `GST_RATE = 0.1` used everywhere; no tax classification per item. |
| **Fee logic** | `lib/stripe.ts` | `calculatePlatformFee(grossAmount)` = max(3.5%, $1.50). Single source of truth for fee; UI duplicates formula. |

### 1.2 Webhook Handler

| Finding | Location | Detail |
|--------|----------|--------|
| **Signature verification** | `app/api/stripe/webhook/route.ts` | Yes — `stripe.webhooks.constructEvent(body, sig, webhookSecret)`. |
| **No event persistence** | Same | Raw event not stored; no `eventId` idempotency. Duplicate/replay deliveries can re-run logic. |
| **No duplicate order guard** | Same | Order created with `prisma.order.create()` without checking existing order by `stripePaymentId`. Same payment can create two orders and decrement stock twice. |
| **Sync processing** | Same | Full order creation, listing update, emails inside POST handler. Slow response risk; no async/queue. |
| **Single event type** | Same | Only `payment_intent.succeeded` handled. No `charge.dispute.*`, `charge.refunded`, etc. |

### 1.3 Order Creation & DB

| Finding | Location | Detail |
|--------|----------|--------|
| **Order.stripePaymentId nullable, non-unique** | `prisma/schema.prisma` | Duplicate orders with same `stripePaymentId` allowed at DB level. |
| **Order status** | Schema | `OrderStatus`: PENDING, PAID, SHIPPED, DELIVERED, DISPUTED, CANCELLED, REFUNDED — but no code sets DISPUTED/REFUNDED. |
| **Listing quantity** | Webhook | Decremented in same flow as order create; no reservation; race possible if two webhook deliveries. |
| **Manual order path** | `app/api/orders/route.ts` POST | Any verified pharmacy can call; creates PAID order with optional `stripePaymentId`; **omits deliveryFee** from `netAmount`; no admin check; no `deliveryFee` on order. |

### 1.4 Invoice & Tax / MoR

| Finding | Location | Detail |
|--------|----------|--------|
| **Header "GalaxRX" + "TAX INVOICE"** | `lib/invoice-pdf-server.ts` | Document could be read as GalaxRX issuing the tax invoice (principal seller). Body correctly shows "FROM (Seller)" / "TO (Buyer)". **High-severity** for MoR clarity. |
| **Platform fee on buyer invoice** | Same | Platform fee and "Amount received by seller" shown — acceptable for transparency but reinforces need for separate GalaxRX-to-seller fee statement. |
| **GST 10%** | Same | Hard-coded "GST (10%)"; no tax classification. |

### 1.5 UI Fee Consistency

| Finding | Location | Detail |
|--------|----------|--------|
| **Listing detail** | `components/listings/ListingDetailPriceBox.tsx` | `platformFee = Math.max(subtotalExGst * 0.035, 1.5)` — correct. |
| **Buy Now modal** | `components/listings/BuyNowModal.tsx` | `platformFee = subtotalExGst * 0.035` — **no minimum $1.50**. |
| **Backend** | create-payment-intent, webhook, orders | All use `calculatePlatformFee(grossAmount)` — consistent. |

### 1.6 Refunds / Disputes / Reconciliation

| Finding | Location | Detail |
|--------|----------|--------|
| **Refunds** | — | No `stripe.refunds.create`, no refund API, no order status update to REFUNDED. |
| **Disputes** | — | No `charge.dispute.created` / `charge.dispute.closed` handlers. |
| **Reconciliation** | — | No table or job linking Order ↔ Stripe PaymentIntent/Charge; no mismatch report. |
| **Seller Connect health** | — | Only check for `stripeAccountId` presence; no checks for charges_enabled, payouts_enabled, or `account.updated`. |

### 1.7 Confirmed Gaps vs Requirements

- **A. Connect model**: Destination charges in use → platform is merchant of record for the charge; seller receives transfer. Higher risk for GalaxRX (chargeback liability on platform).
- **B. Duplicate orders**: No DB unique on `stripePaymentId`; no webhook idempotency → duplicate orders and double stock decrement possible.
- **C. Webhook reliability**: No event persistence; no 2xx-then-process pattern; no replay/dead-letter.
- **D. Payment idempotency**: No idempotency key on PI create; no persisted payment attempt.
- **E. Manual order path**: Open to any verified user; netAmount wrong (no deliveryFee); no MANUAL source flag.
- **F. Refunds**: Not implemented.
- **G. Disputes**: Not implemented.
- **H. Inventory**: No reservation; decrement on webhook only → oversell possible under race.
- **I. Reconciliation**: No ledger/event table; no reconciliation script.
- **J. GST/Tax**: Hard-coded 10%; no tax classification; invoice header could imply GalaxRX as issuer.
- **K. Fee consistency**: Buy Now modal omits min $1.50.
- **L. Seller account health**: Only presence of stripeAccountId.
- **M/N**: No fraud/ops controls or explicit MoR/refund policy UX.

---

## SECTION 2 — Safest Target Design

### 2.1 Recommended Connect Charge Model

- **Status**: Feature-flagged direct-charge path implemented. Set `STRIPE_USE_DIRECT_CHARGES=true` in `.env` to activate. Test thoroughly in Stripe test mode before enabling in production. When direct charges are active, `application_fee_amount` is platform fee only (not GST).
- **Target: Direct charges.** Create PaymentIntent on the **connected (seller) account** with `Stripe-Account` header; set `application_fee_amount` so GalaxRX receives the marketplace fee. Buyer pays the connected account; connected account is merchant of record; refunds/chargebacks are against the seller’s account by default.
- **Current: Destination charges.** Charge on platform; transfer to seller. Platform is MoR for the charge; higher chargeback/refund risk for GalaxRX.
- **Migration**: Implement all safeguards and idempotency with current destination flow first (so duplicate/double-decrement and manual-order risks are removed), then add a second code path for direct charges (create PI on connected account, return client_secret from that PI). Feature-flag or config switch; once validated, make direct the default and deprecate destination.

### 2.2 Schema Changes (Implemented or Planned)

- **StripeEvent**: `id`, `eventId` (unique), `type`, `payloadJson`, `receivedAt`, `processedAt`, `processingStatus`, `errorMessage` — persist every webhook, process idempotently.
- **PaymentAttempt**: `id`, `buyerId`, `sellerId`, `listingId`/`wantedOfferId`, `quantity`, `deliveryFeeExGst`, `grossAmountCents`, `platformFeeCents`, `gstAmountCents`, `totalChargedCents`, `netToSellerCents`, `status`, `stripePaymentIntentId`, `idempotencyKey` (unique), `expiresAt`, `createdAt`, `updatedAt` — one per checkout attempt; idempotency key used in Stripe PI create.
- **Order**: `stripePaymentId` unique when not null; add `source` enum (`STRIPE` | `MANUAL`); ensure `deliveryFee` and correct `netAmount` for manual.
- **Refund** (new): `id`, `orderId`, `stripeRefundId`, `amountCents`, `reason`, `initiatorId`, `createdAt` — audit trail for refunds.
- **Order**: optional `disputedAt`, `disputeId` for dispute tracking.

### 2.3 State Model

- PaymentAttempt: `QUOTED` → `PAYMENT_INTENT_CREATED` → (on success) → Order `PAID`.
- Order: `PENDING` | `PAID` | `SHIPPED` | `DELIVERED` | `REFUNDED_PARTIAL` | `REFUNDED_FULL` | `DISPUTED` | `CANCELLED` | `MANUAL_REVIEW` | `OVERSOLD`.
- Webhook: persist event → if `payment_intent.succeeded`, look up by `stripePaymentId`; if order exists return 200; else create order (and update attempt if used).

### 2.4 Webhook Architecture

- Verify signature → persist to StripeEvent → return 200 quickly (or 200 after minimal work).
- Process business logic in same request but **idempotent**: e.g. for `payment_intent.succeeded`, `findFirst({ where: { stripePaymentId: pi.id } })`; if found, skip create/update; else create order and decrement listing.
- Replay: reprocessing same eventId updates StripeEvent.processedAt/processingStatus; business logic remains idempotent by stripePaymentId/order.

### 2.5 Refund / Dispute Architecture

- **Refunds**: API (e.g. seller or admin) creates refund via Stripe (on platform charge for destination; on connected charge for direct). Persist Refund row; update Order status to REFUNDED_*; restore listing quantity by policy.
- **Disputes**: Handle `charge.dispute.created` / `charge.dispute.closed`; set Order to DISPUTED; store dispute id; notify seller and ops. With direct charges, dispute is against seller’s account.

### 2.6 Tax / Invoice Architecture

- Centralize tax in a service: e.g. `getTaxRate(item)` → 0.1 or 0 (GST_FREE) or REVIEW; persist tax basis on PaymentAttempt/Order.
- Invoice: Title e.g. "Tax Invoice (Seller to Buyer)" or "Invoice"; subtitle "GalaxRX Marketplace — Transaction receipt". FROM = Seller, TO = Buyer. GalaxRX as "Facilitated by GalaxRX" or footer. Separate "GalaxRX Marketplace Fee Statement" for seller (fee only) when required.

### 2.7 Reconciliation

- Table or view: Order ↔ stripePaymentId ↔ PaymentIntent/Charge id (from metadata or StripeEvent). Admin job: list orders with stripePaymentId but no matching Stripe payment; Stripe payments with no order; amount mismatches.

### 2.8 Why This Is Lower Risk for GalaxRX

- **Direct charges**: Seller is MoR; chargebacks hit seller’s Stripe account; GalaxRX fee is application_fee.
- **Idempotency**: One payment → one order; duplicate webhooks don’t duplicate orders or stock.
- **Manual orders**: Admin-only, clearly marked MANUAL; no confusion with Stripe-paid.
- **Refunds/disputes**: Explicit flows and audit; with direct charges, seller bears primary liability.
- **Invoice wording**: Seller as issuer of goods invoice; GalaxRX fee separate.

---

## SECTION 3 — Migration Strategy

1. **Phase 1 (no Connect model change)**  
   - Add StripeEvent + PaymentAttempt (with migrations).  
   - Webhook: persist event; idempotent order creation by stripePaymentId; optional PaymentAttempt link.  
   - create-payment-intent: accept idempotency key; create PaymentAttempt; pass idempotency key to Stripe.  
   - Orders POST: admin-only; source=MANUAL; fix deliveryFee and netAmount.  
   - Order: unique(stripePaymentId); source enum.  
   - Centralized quote (server) and use in UI (Buy Now modal min fee).  
   - Invoice: wording update (seller as supplier / "Facilitated by GalaxRX").  
   - Refund stub API; dispute webhook stub; reconciliation query/script.

2. **Phase 2 (direct charges)**  
   - New path: create PaymentIntent on connected account; return that client_secret.  
   - Client may need to use Stripe.js with connected account context if required.  
   - Run in parallel (e.g. feature flag); validate; then switch default and deprecate destination.

3. **Rollback**: Feature flag or config to revert to destination-only; keep destination code path until direct is proven.

---

## SECTION 4 — Implementation Plan

- **Phase 1a**: DB migrations (StripeEvent, PaymentAttempt, Order.stripePaymentId unique, Order.source).  
- **Phase 1b**: Webhook: persist event, idempotent order create.  
- **Phase 1c**: create-payment-intent idempotency + PaymentAttempt.  
- **Phase 1d**: Orders POST admin-only + MANUAL + deliveryFee/netAmount fix.  
- **Phase 1e**: Centralized quote; Buy Now modal fee; invoice wording.  
- **Phase 1f**: Refund API (destination charge path); dispute webhook handlers; reconciliation endpoint.  
- **Phase 2**: Direct charge path (separate task).

---

## SECTION 5 — Code Changes

(See implementation below.)

---

## SECTION 6 — Tests / Verification

- Duplicate webhook: send same `payment_intent.succeeded` twice → only one order; quantity decremented once.  
- Payment create retry with same idempotency key → same PaymentIntent returned.  
- Manual order: non-admin POST /api/orders → 403.  
- Manual order: admin creates with deliveryFee → netAmount = grossAmount - platformFee + deliveryFee.  
- Full refund: order status REFUNDED_FULL; partial refund: REFUNDED_PARTIAL.  
- Dispute created: order status DISPUTED.  
- Fee consistency: backend quote vs ListingDetailPriceBox vs BuyNowModal all use min $1.50.  
- Reconciliation: endpoint returns list of mismatches (no order for PI; no PI for order; amount mismatch).

---

## SECTION 7 — Outstanding Business/Legal Decisions

- **GST treatment by product type**: Tax classification (TAXABLE vs GST_FREE) not yet implemented; currently 10% applied everywhere. Legal/accounting sign-off required.
- **Merchant of record**: Legal wording in T&Cs that seller is supplier; GalaxRX as marketplace facilitator. Invoice wording updated in code; legal review recommended.
- **Fee on refund**: Who absorbs GalaxRX fee on refund (full vs partial; reason-based). Current refund API uses `refund_application_fee: true` (destination charge); policy not documented.
- **Dispute loss recovery**: Seller vs platform liability when dispute is lost; Stripe Connect destination charge means chargeback hits platform first.
- **Invoice issuer**: Who legally issues the buyer-facing tax invoice (seller vs GalaxRX) — code now states seller as supplier; legal/accounting confirmation required.
- **Destination vs direct charges**: Current implementation remains destination charges. Migration path to direct charges documented; implement when business approves.

---

## Deploy / migration

1. **Database**: Run `npx prisma generate` then `npx prisma db push`. If you see a warning about unique constraint on `Order.stripePaymentId`, ensure there are no duplicate non-null values (e.g. `SELECT "stripePaymentId", COUNT(*) FROM "Order" WHERE "stripePaymentId" IS NOT NULL GROUP BY "stripePaymentId" HAVING COUNT(*) > 1;`). Fix or remove duplicates before applying.
2. **Stripe webhook**: Ensure your Stripe webhook endpoint is configured to send at least: `payment_intent.succeeded`, `charge.dispute.created`, `charge.dispute.updated`.
3. **Manual order callers**: Any client that previously called POST `/api/orders` with listingId/quantity (e.g. for testing) must stop; the route now requires ADMIN role and body `{ listingId, quantity, buyerId, deliveryFee? }`.
