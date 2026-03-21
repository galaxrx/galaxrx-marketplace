# GalaxRX Marketplace — Financial Master Report

This document describes the financial model, user financial interactions, and end-to-end financial flow for the GalaxRX B2B pharmacy marketplace (Australia, AUD).

---

## 1. Financial Model

### 1.1 Revenue Structure

| Component | Rule | Implementation |
|-----------|------|-----------------|
| **Platform fee** | 3.5% of gross sale amount (product only), **minimum $1.50 per transaction** | `lib/stripe.ts`: `calculatePlatformFee(grossAmount)` = `max(grossAmount × 0.035, 1.50)` |
| **GST** | 10% on (gross product amount + delivery fee), charged to buyer | `GST_RATE = 0.1`; applied to subtotal ex-GST before payment |
| **Currency** | AUD | All Stripe PaymentIntents use `currency: "aud"` |

### 1.2 Definitions (AUD, ex-GST unless stated)

- **Gross amount**: `unitPrice × quantity` (product only, ex-GST).
- **Delivery fee**: Optional, ex-GST; set per listing or overridden at checkout (e.g. Australia Post). Not included in platform fee base.
- **Subtotal ex-GST**: `grossAmount + deliveryFee`.
- **GST amount**: `subtotalExGST × 0.1`.
- **Total charged to buyer**: `subtotalExGST + gstAmount` (inc-GST).
- **Platform fee**: `calculatePlatformFee(grossAmount)` — 3.5% of gross, min $1.50.
- **Net to seller**: `grossAmount - platformFee + deliveryFee` (seller keeps delivery; platform fee is on product only).

### 1.3 Who Holds What

- **Platform (GalaxRX)**: Receives `application_fee_amount` = platform fee + GST portion (Stripe keeps platform fee and remits GST per Stripe’s handling).
- **Seller (Connected account)**: Receives the transfer from the PaymentIntent (net to seller) per Stripe Connect `transfer_data.destination`.
- **Buyer**: Pays total charged (subtotal + GST); no separate “buyer fee”.

### 1.4 Important Constraints

- Platform fee is **never** calculated on delivery fee — only on `grossAmount` (product).
- Minimum $1.50 applies per **transaction** (per order), not per unit.
- All fee logic is centralized in `lib/stripe.ts`; API routes and webhook use `calculatePlatformFee()` or metadata written at payment-intent creation.

---

## 2. User Financial Interactions

### 2.1 Seller (Pharmacy Selling)

| Action | Description | Financial impact |
|--------|-------------|------------------|
| **Connect bank (Stripe Connect)** | Onboarding via `/api/stripe/connect-onboard` → Stripe Account (Standard, AU). Account ID stored as `Pharmacy.stripeAccountId`. | Required before receiving payouts. No fee for connecting. |
| **Create listing** | Set `pricePerPack` (ex-GST), optional `deliveryFee` (ex-GST). | No immediate financial event. |
| **Accept wanted offer** | Offer has `pricePerPack`, `quantity`. | No money movement until buyer pays. |
| **Receive payment** | After buyer pays, Stripe transfers **net to seller** to connected account. | Seller receives `grossAmount - platformFee + deliveryFee`. |
| **View sales** | GET `/api/orders?type=sales` returns orders with `grossAmount`, `platformFee`, `netAmount`, `deliveryFee`, `gstAmount`. | Informational. |

**Guards**: Seller cannot complete a listing or wanted-offer sale without `stripeAccountId`. Buyer cannot pay if seller has not connected.

### 2.2 Buyer (Pharmacy Buying)

| Action | Description | Financial impact |
|--------|-------------|------------------|
| **Checkout (listing)** | Chooses quantity, delivery option (and optionally Australia Post rate). Calls `/api/stripe/create-payment-intent` with `listingId`, `quantity`, optional `deliveryFee`. | PaymentIntent created: `amount` = total charged (inc-GST); `application_fee_amount` = platform fee + GST; rest transferred to seller. |
| **Checkout (wanted offer)** | Pays for an accepted offer. Calls create-payment-intent with `wantedOfferId`, optional `deliveryFee`. | Same structure: total charged to buyer; platform takes fee; seller gets net. |
| **Confirm payment** | Client confirms with Stripe (e.g. `stripe.confirmPayment`). | Charge created; webhook `payment_intent.succeeded` runs. |
| **View purchases** | GET `/api/orders?type=purchases`. | Sees order totals, GST, platform fee (on invoice). |
| **Invoice** | After payment, buyer receives email with PDF invoice (order id, amounts, GST, platform fee, net). | No extra charge. |

**Guards**: Buyer must be verified (`isVerified`). Cannot buy own listing. Quantity must be ≤ available.

### 2.3 Platform (GalaxRX)

- **Revenue**: Application fee on each PaymentIntent (platform fee + GST component).
- **No direct “payout” API** in app: Stripe routes funds to platform and to connected accounts automatically via PaymentIntent configuration.

### 2.4 Edge Cases / Gaps (for risk analysis)

- **Orders API POST** (`/api/orders` POST): **Now admin-only.** Creates order with `source: MANUAL`; requires `buyerId`, `listingId`, `quantity`; optional `deliveryFee`. Net amount = grossAmount − platformFee + deliveryFee. No Stripe charge; for internal/offline orders only.
- **Refunds**: Implemented. POST `/api/orders/[id]/refund` (admin) creates Stripe refund, persists `Refund` record, updates order status. **Disputes**: Webhook handlers for `charge.dispute.created` / `charge.dispute.updated` set order to DISPUTED and store dispute id.
- **UI consistency**: Listing detail and Buy Now modal both use platform fee = max(3.5% of gross, $1.50).

---

## 3. Financial Flow

### 3.1 End-to-End (Stripe Connect — Listing or Wanted Offer)

```
1. Buyer (verified) selects listing or accepted wanted offer, quantity, delivery option.
2. Frontend calls POST /api/stripe/create-payment-intent
   - Body: listingId + quantity + optional deliveryFee, OR wantedOfferId + optional deliveryFee.
3. Backend (create-payment-intent):
   - Loads listing or offer and seller; checks seller has stripeAccountId.
   - Computes: grossAmount, deliveryFeeExGST, subtotalExGST, gstAmount, totalCharged,
     platformFee = calculatePlatformFee(grossAmount), netToSeller = grossAmount - platformFee + deliveryFeeExGST.
   - Creates Stripe PaymentIntent:
     - amount = totalCharged (in cents), currency "aud"
     - application_fee_amount = (gstAmount + platformFee) in cents
     - transfer_data.destination = seller.stripeAccountId
     - metadata: listingId or wantedOfferId, buyerId, sellerId, quantity, unitPrice, grossAmount,
       deliveryFee, platformFee, gstAmount, netToSeller
   - Returns clientSecret to frontend.
4. Frontend: customer completes payment (Stripe Elements / confirmPayment).
5. Stripe charges buyer; transfers net to seller; keeps application_fee for platform.
6. Stripe sends webhook: payment_intent.succeeded.
7. Backend (webhook):
   - Verifies signature; reads metadata (or recalculates platformFee with calculatePlatformFee if missing).
   - Creates Order (listingId or wantedOfferId, buyerId, sellerId, quantity, unitPrice, grossAmount,
     deliveryFee, platformFee, gstAmount, netAmount, stripePaymentId, status PAID).
   - If listing: decrements listing quantity; sets isActive = (newQty > 0).
   - Increments seller tradeCount.
   - Sends emails (new sale to seller, purchase confirmation + invoice PDF to buyer).
8. Money: Buyer paid totalCharged; platform has application_fee; seller has netToSeller in Connect account.
```

### 3.2 Flow Diagram (Logical)

```
[Buyer] --> [Create PaymentIntent] --> [Stripe]
                |                         |
                | (clientSecret)           | (charge + transfer + application_fee)
                v                         v
[Stripe Elements / Confirm]          [Webhook: payment_intent.succeeded]
                |                         |
                |                         v
                |                    [Create Order, update Listing, emails]
                |                         |
                v                         v
[Redirect / Success]              [Seller payout via Connect]
```

### 3.3 Data Stored per Order

- **Order**: `unitPrice`, `grossAmount`, `deliveryFee`, `platformFee`, `gstAmount`, `netAmount`, `stripePaymentId`, `status` (e.g. PAID).
- **Stripe**: Charge, PaymentIntent, Transfer to connected account, Application fee. All can be reconciled via `stripePaymentId` and metadata.

### 3.4 Idempotency and Consistency

- **Idempotency**: PaymentIntent is created with a server/client idempotency key (`create-payment-intent` accepts `idempotencyKey`; Stripe deduplicates). Webhook persists every event in `StripeEvent` and checks for existing order by `stripePaymentId` before creating — duplicate webhook deliveries do not create duplicate orders.
- **Consistency**: Fee and net amounts are derived from metadata written at PaymentIntent creation; webhook prefers metadata over recalculation. Centralized pricing in `lib/pricing.ts` and `lib/stripe.ts`; UI (ListingDetailPriceBox, BuyNowModal) uses same 3.5% min $1.50 rule.

### 3.5 Post-Audit Implementation (Payment Architecture Hardening)

The following changes were implemented to reduce financial and operational risk for GalaxRX:

| Area | Change |
|------|--------|
| **Connect model** | Current architecture remains **destination charges** (charge on platform, transfer to seller). Target design for lowest platform risk is **direct charges**; see `docs/PAYMENT_ARCHITECTURE_AUDIT.md` for migration path. |
| **Webhook** | All events persisted in `StripeEvent` (by `eventId`). `payment_intent.succeeded`: order created only if no order exists with same `stripePaymentId`; event marked PROCESSED/FAILED. Duplicate deliveries do not create duplicate orders or double-decrement stock. |
| **Order** | `Order.stripePaymentId` has a DB unique constraint. `Order.source` added: `STRIPE` (from webhook) or `MANUAL` (admin-created). Dispute fields: `disputedAt`, `stripeDisputeId`. |
| **Manual orders** | POST `/api/orders` is **admin-only**. Requires `buyerId`, `listingId`, `quantity`; optional `deliveryFee`. Sets `source: MANUAL`, `stripePaymentId: null`. Net amount = grossAmount − platformFee + deliveryFee. |
| **Payment idempotency** | `create-payment-intent` accepts optional `idempotencyKey`; passed to Stripe so retries return the same PaymentIntent. BuyNowModal sends key derived from listingId, quantity, deliveryFee. |
| **Refunds** | POST `/api/orders/[id]/refund` (admin-only) creates Stripe refund for Stripe-paid orders, persists `Refund` record, updates order status to REFUNDED_FULL or REFUNDED_PARTIAL. |
| **Disputes** | Webhook handles `charge.dispute.created` and `charge.dispute.updated`: order status set to DISPUTED, `stripeDisputeId` and `disputedAt` stored. |
| **Invoice** | Wording updated: "Tax Invoice (Seller to Buyer)", "Transaction facilitated by GalaxRX. Seller named below is the supplier of the goods." Footer: "GalaxRX Marketplace — Platform fee charged to seller. GalaxRX is not the seller of the goods." Platform fee label: "3.5%, min $1.50". |
| **Fee consistency** | BuyNowModal uses `Math.max(subtotalExGst * 0.035, 1.5)` and includes delivery in sellerReceives. |
| **Reconciliation** | GET `/api/admin/reconciliation` returns orders with Stripe checked, amount mismatches, manual order count, and StripeEvent PENDING/FAILED counts. |
| **New schema** | `StripeEvent`, `PaymentAttempt`, `Refund` models; see `prisma/schema.prisma`. Apply with `npx prisma db push` (resolve any duplicate `stripePaymentId` first). |

---

## 4. Prompt for ChatGPT: Risk Reduction and Smoother Finance

Copy the block below and paste it into ChatGPT, after optionally attaching or pasting this document, so ChatGPT can analyze the financial setup and suggest how to reduce risks and make finance operations smoother.

---

### Start of prompt (copy below this line)

```
I'm sharing a Financial Master Report for a B2B pharmacy marketplace (GalaxRX) that uses Stripe Connect in Australia (AUD). I need you to analyze it and provide concrete recommendations to:

1. **Reduce financial and operational risks** (e.g. duplicate orders, refunds/chargebacks, missing webhooks, reconciliation, fraud, compliance).
2. **Make the finance flow smoother** (e.g. idempotency, clear audit trail, seller/buyer communication, edge cases).

Please read the report below (or the attached FINANCIAL_MASTER_REPORT.md) and then:

- List the main risks you identify (with severity: high/medium/low).
- For each risk, suggest one or more concrete mitigations (code, process, or Stripe/dashboard configuration).
- Suggest improvements for smoother operations (e.g. webhook idempotency, handling of failed webhooks, refund policy and implementation, reporting, and any UI/UX that affects trust or clarity of fees).
- If relevant, mention Stripe best practices (Connect, webhooks, disputes) and Australian considerations (GST, invoicing).

Keep recommendations actionable and specific to this kind of marketplace (platform fee, Connect transfers, single currency AUD).
```

**Then paste or attach the full content of this document (sections 1–3 above, or the FINANCIAL_MASTER_REPORT.md file).**

### End of prompt

---

*Document version: 1.1 — Updated after payment architecture audit and implementation (webhook idempotency, admin-only manual orders, refunds, disputes, reconciliation, invoice wording, fee consistency). See docs/PAYMENT_ARCHITECTURE_AUDIT.md for full audit and target design.*
