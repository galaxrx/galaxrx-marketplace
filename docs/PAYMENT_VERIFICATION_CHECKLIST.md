# Payment & Finance Verification Checklist

Use this checklist to verify the payment architecture safeguards after deployment.

## 1. Duplicate order prevention

- [ ] Send the same `payment_intent.succeeded` webhook payload twice (e.g. replay from Stripe dashboard or duplicate event). **Expected**: Only one order created; `StripeEvent` shows second event as PROCESSED without creating a second order.
- [ ] Query: `SELECT COUNT(*), "stripePaymentId" FROM "Order" WHERE "stripePaymentId" IS NOT NULL GROUP BY "stripePaymentId" HAVING COUNT(*) > 1;` **Expected**: 0 rows.

## 2. Payment creation idempotency

- [ ] Call POST `/api/stripe/create-payment-intent` twice with the same body (same `listingId`, `quantity`, `deliveryFee`, `idempotencyKey`) within a few seconds. **Expected**: Same `clientSecret` returned (Stripe returns same PaymentIntent when idempotency key is reused).
- [ ] Buy Now modal: open, change quantity, then change back; or trigger a retry. **Expected**: No duplicate PaymentIntents for the same effective quote.

## 3. Manual order path

- [ ] As a non-admin (e.g. PHARMACY role), POST to `/api/orders` with `{ listingId, quantity, buyerId }`. **Expected**: 403, message "Only administrators can create manual orders."
- [ ] As ADMIN, POST with `{ listingId, quantity, buyerId, deliveryFee: 5 }`. **Expected**: 201, order with `source: "MANUAL"`, `stripePaymentId: null`, `deliveryFee: 5`, `netAmount = grossAmount - platformFee + 5`.

## 4. Refund flow

- [ ] As admin, POST `/api/orders/[id]/refund` for an order that has `stripePaymentId`, with body `{}` (full refund). **Expected**: 200, order status becomes REFUNDED_FULL; Refund record exists; Stripe dashboard shows refund.
- [ ] As admin, POST with `{ amountCents: 1000 }` for partial refund. **Expected**: 200, order status REFUNDED_PARTIAL; Refund record with amountCents 1000.

## 5. Dispute handling

- [ ] In Stripe Dashboard, create a test dispute for a charge that corresponds to an order. **Expected**: Webhook `charge.dispute.created` received; order status set to DISPUTED; `stripeDisputeId` and `disputedAt` set.

## 6. Fee consistency

- [ ] Listing detail page: note "Platform fee (3.5%, min $1.50)" and the dollar amount. For a small basket (e.g. $20 subtotal), amount should be $1.50 (minimum).
- [ ] Buy Now modal: same rule; "seller receives" should be subtotal − platformFee + deliveryFee.

## 7. Reconciliation

- [ ] GET `/api/admin/reconciliation` as ADMIN. **Expected**: JSON with `ordersWithStripeChecked`, `mismatches` (array), `manualOrdersCount`, `stripeEventsPending`, `stripeEventsFailed`. No duplicate stripePaymentId in orders.

## 8. Invoice wording

- [ ] Complete a test purchase; open the PDF invoice from email. **Expected**: Title "Tax Invoice (Seller to Buyer)"; subtitle "Transaction facilitated by GalaxRX. Seller named below is the supplier of the goods." Footer mentions "GalaxRX is not the seller of the goods." Platform fee line: "3.5%, min $1.50".

## 9. Database constraints

- [ ] After `npx prisma db push`, confirm `Order` has unique constraint on `stripePaymentId` (e.g. in DB client: unique index exists). **Expected**: Prevents two orders with the same stripePaymentId.

## 10. Webhook event persistence

- [ ] After a few successful payments, query `SELECT "eventId", type, "processingStatus" FROM "StripeEvent" ORDER BY "receivedAt" DESC LIMIT 10;`. **Expected**: Events for `payment_intent.succeeded` (and optionally disputes) with processingStatus PROCESSED.

---

When adding a test runner (e.g. Jest or Vitest), add unit tests for:

- `calculatePlatformFee(grossAmount)` → min $1.50 for small amounts; 3.5% for larger.
- `calculateQuote({ unitPriceExGst, quantity, deliveryFeeExGst })` → correct totals and cents.
- Webhook idempotency: mock Prisma and Stripe; call handler twice with same pi.id → order create called once.
