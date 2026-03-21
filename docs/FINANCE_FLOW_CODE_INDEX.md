# GalaxRX — Finance Flow: All Related Code

Index of every file and area that touches payments, fees, tax, orders, refunds, Stripe Connect, invoices, and reconciliation. Excludes `node_modules`.

---

## 1. Core finance / Stripe config

| File | Role |
|------|------|
| **lib/stripe.ts** | Stripe client, `GST_RATE` (re-export from tax), `PLATFORM_FEE_PERCENT`, `MIN_PLATFORM_FEE`, `calculatePlatformFee()` |
| **lib/stripe-charge-model.ts** | Charge model: `getChargeModel()` (destination vs direct from `STRIPE_USE_DIRECT_CHARGES`) |
| **lib/tax.ts** | Tax: `TaxClassification`, `GST_RATE`, `getTaxClassification()`, `calculateGst()` |
| **lib/pricing.ts** | Centralized quote: `calculateQuote()` (gross, delivery, GST, platform fee, net, all in dollars + cents) |

---

## 2. Payment creation (checkout)

| File | Role |
|------|------|
| **app/api/stripe/create-payment-intent/route.ts** | Creates PaymentIntent for listing or wanted offer; reservation (listing); fee/tax/charge model (destination vs direct); idempotency key; seller account health check; metadata (chargeModel, taxClassification, reservedQty, etc.) |

---

## 3. Stripe webhooks (payment success, disputes, account)

| File | Role |
|------|------|
| **app/api/stripe/webhook/route.ts** | Persists `StripeEvent`; handles `payment_intent.succeeded` (idempotent order create, listing decrement, reservedQty release, emails); `charge.dispute.created` / `charge.dispute.updated` (order → DISPUTED); `charge.dispute.closed` (DISPUTE_LOST / PAID); `account.updated` (pharmacy `stripeChargesEnabled` / `stripePayoutsEnabled`) |

---

## 4. Orders API

| File | Role |
|------|------|
| **app/api/orders/route.ts** | GET: list orders (purchases/sales) with amounts. POST: admin-only manual order creation (source=MANUAL, fee + netAmount + deliveryFee) |
| **app/api/orders/[id]/status/route.ts** | PUT: update order status (SHIPPED, DELIVERED); used for fulfillment, not payment |
| **app/api/orders/[id]/refund/route.ts** | POST: admin refund; reads PaymentIntent metadata (chargeModel); creates Stripe refund (destination: reverse_transfer + refund_application_fee; direct: no reverse_transfer); persists `Refund`; order → REFUNDED_*; restores listing qty on full refund |

---

## 5. Stripe Connect (seller onboarding & status)

| File | Role |
|------|------|
| **app/api/stripe/connect-onboard/route.ts** | POST: start Stripe Connect onboarding; create/link Connect account; return account link URL |
| **app/api/stripe/connect-status/route.ts** | GET: session’s Connect account health (connected, chargesEnabled, payoutsEnabled, requirements, reason) |

---

## 6. Invoices & purchase emails

| File | Role |
|------|------|
| **lib/invoice-pdf-server.ts** | `generateInvoicePDF()` — PDF with amounts, GST, platform fee, net; seller/buyer as FROM/TO; MoR wording |
| **lib/resend.ts** | `sendNewSale()`, `sendPurchaseConfirmed()` (with optional invoice PDF attachment) — triggered from webhook after order create |

---

## 7. Admin finance (stats, reconciliation)

| File | Role |
|------|------|
| **app/api/admin/stats/route.ts** | GET: admin stats (total GMV, platformFeesCollected from orders, etc.) |
| **app/api/admin/reconciliation/route.ts** | GET: admin reconciliation (orders vs Stripe PaymentIntent, mismatches, manual order count, StripeEvent PENDING/FAILED) |

---

## 8. UI that shows or drives finance

| File | Role |
|------|------|
| **components/listings/ListingDetailPriceBox.tsx** | Listing detail: unit price, quantity, subtotal, GST, total, platform fee (3.5% min $1.50), delivery |
| **components/listings/BuyNowModal.tsx** | Checkout modal: quantity, delivery, subtotal, GST, total, platform fee; calls create-payment-intent; idempotencyKey; Stripe Elements confirm |
| **components/orders/OrderCard.tsx** | Displays one order (amounts, status, tracking) |
| **components/orders/OrdersPageClient.tsx** | Orders list (purchases/sales) |
| **app/(dashboard)/orders/page.tsx** | Orders dashboard page (fetches orders) |
| **app/(dashboard)/dashboard/_components/DashboardOrders.tsx** | Dashboard orders widget |
| **app/(dashboard)/dashboard/_components/DashboardStats.tsx** | Dashboard stats (may show order/finance summary) |
| **components/wanted/PayAcceptedOfferClient.tsx** | Pay for accepted wanted offer (calls create-payment-intent with wantedOfferId) |
| **app/(dashboard)/wanted/offer/[offerId]/pay/page.tsx** | Pay page for accepted offer |
| **components/settings/SettingsClient.tsx** | Settings: Connect bank (connect-onboard), may show connect status |
| **app/(dashboard)/settings/page.tsx** | Settings page |
| **app/(dashboard)/account/page.tsx** | Account page (may reference payment/orders) |
| **app/admin/page.tsx** | Admin dashboard (may show finance stats) |

---

## 9. Database schema (finance-related)

| File | Role |
|------|------|
| **prisma/schema.prisma** | **Pharmacy**: stripeAccountId, stripeCustomerId, stripeChargesEnabled, stripePayoutsEnabled. **Listing**: pricePerPack, deliveryFee, reservedQty, isGstFree. **Order**: unitPrice, grossAmount, deliveryFee, platformFee, gstAmount, netAmount, stripePaymentId, source, status, disputedAt, disputeClosedAt, stripeDisputeId. **StripeEvent**, **PaymentAttempt**, **Refund**. Enums: OrderSource, OrderStatus (incl. DISPUTE_LOST, REFUNDED_*). |

---

## 10. Environment & docs

| File | Role |
|------|------|
| **.env.example** | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_USE_DIRECT_CHARGES |
| **docs/FINANCIAL_MASTER_REPORT.md** | Financial model, user flows, end-to-end flow, post-audit implementation notes |
| **docs/PAYMENT_ARCHITECTURE_AUDIT.md** | Audit, target design, migration, direct vs destination, refund/dispute, reconciliation |
| **docs/PAYMENT_VERIFICATION_CHECKLIST.md** | Verification checklist for payment/reservation/refund/dispute |
| **docs/FINANCE_FLOW_CODE_INDEX.md** | This index |

---

## 11. Other references (minor or indirect)

| File | Role |
|------|------|
| **lib/auth.ts** | Session/auth; used by all protected finance routes (no fee logic) |
| **lib/platform.ts** | Platform config (may be used in pricing or feature flags) |
| **app/api/listings/[id]/route.ts** | Listing fetch; listing has price, deliveryFee, isGstFree |
| **app/api/reviews/route.ts** | Reviews; may filter by order (order is finance entity) |
| **app/terms/page.tsx** | Terms (may mention payments/fees) |
| **app/privacy/page.tsx** | Privacy (may mention payment data) |
| **components/account/AccountPaymentMethods.tsx** | Payment methods UI (Stripe/payment surface) |

---

## Quick path summary

- **Create payment (listing):** `BuyNowModal` → `POST /api/stripe/create-payment-intent` (listingId, quantity, deliveryFee, idempotencyKey) → Stripe confirm → **webhook** `payment_intent.succeeded` → create Order, decrement listing, release reservedQty, emails + invoice.
- **Create payment (wanted offer):** `PayAcceptedOfferClient` / pay page → `POST /api/stripe/create-payment-intent` (wantedOfferId) → same webhook flow.
- **Refund:** Admin → `POST /api/orders/[id]/refund` → read PI metadata (chargeModel) → Stripe refund (destination vs direct params) → Refund row, order status, optional listing qty restore.
- **Connect:** Seller → Connect bank → `POST /api/stripe/connect-onboard`; status → `GET /api/stripe/connect-status`.
- **Reconciliation:** Admin → `GET /api/admin/reconciliation`.

All of the above are the code locations that implement or display the finance flow in the app.
