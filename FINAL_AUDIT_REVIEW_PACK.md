# GalaxRX Stripe / Finance — Final Audit-Only Review Pack

**Scope:** Transaction flow, financial flow, product/listing status flow. No code changes.

---

## SECTION 1 — File inventory

### Create / checkout
| Path | Purpose |
|------|--------|
| `app/api/stripe/create-payment-intent/route.ts` | POST handler: listing + wanted-offer create PaymentIntent; idempotency; P2002 retry; reservation (listing); expiry handling |
| `components/listings/BuyNowModal.tsx` | Listing checkout UI: calls create-payment-intent with `listingId`, `quantity`, `deliveryFee`, `idempotencyKey` (`pi-${listing.id}-${quantity}-${deliveryFeeExGst}`) |
| `components/wanted/PayAcceptedOfferClient.tsx` | Wanted-offer pay UI: calls create-payment-intent with `wantedOfferId`, `idempotencyKey` (`pi-wanted-${offer.id}-${deliveryFeeExGST}`) |

### Webhook / finalization
| Path | Purpose |
|------|--------|
| `app/api/stripe/webhook/route.ts` | POST: verify signature, persistStripeEvent, processStripeEventPayload; payment_intent.succeeded / payment_failed / canceled; dispute; account.updated |
| `app/api/admin/stripe-retry-failed/route.ts` | GET (list eligible) / GET ?run=1 (run batch) / POST: retry FAILED/PENDING StripeEvent via processStripeEventPayload |

### Pricing / tax / charge
| Path | Purpose |
|------|--------|
| `lib/pricing.ts` | calculateListingQuote, calculateQuote (legacy); ListingQuote/Quote types; cents for persistence |
| `lib/tax.ts` | getTaxClassification, calculateGst; GST_RATE; TaxClassification / TaxResult |
| `lib/platform-fee.ts` | PLATFORM_FEE_PERCENT, MIN_PLATFORM_FEE, calculatePlatformFee |
| `lib/destination-charge.ts` | calculateDestinationChargeAmounts; application_fee_amount = platform fee only |
| `lib/stripe-charge-model.ts` | getChargeModel(); DirectChargeNotSupportedError; destination-only enforcement |
| `lib/stripe.ts` | Stripe client; re-exports calculatePlatformFee, GST_RATE, platform-fee constants |

### Refunds
| Path | Purpose |
|------|--------|
| `app/api/orders/[id]/refund/route.ts` | POST: admin-only refund; totalChargedCents/chargeModel from Order; Stripe refund; Refund record + order status + listing stock in one transaction |

### Inventory / reservation / status
| Path | Purpose |
|------|--------|
| `lib/listing-reservation.ts` | releaseListingReservationIfActive, expireListingReservationIfActive, findStaleListingReservations, repairStaleListingReservations; RESERVATION_STATUS |
| `app/api/admin/repair-stale-reservations/route.ts` | GET: list stale; POST: run repairStaleListingReservations (admin) |
| `app/api/orders/[id]/status/route.ts` | PUT: order status SHIPPED (seller) / DELIVERED (buyer); PAID→SHIPPED→DELIVERED enforcement |

### Operational outputs (order finalization correctness only)
| Path | Purpose |
|------|--------|
| `lib/resend.ts` | sendNewSale, sendPurchaseConfirmed (invoice attachment), sendOrderShipped |
| `lib/invoice-pdf-server.ts` | generateInvoicePDF(OrderForInvoice); uses order amounts/listing for PDF |

### Schema
| Path | Purpose |
|------|--------|
| `prisma/schema.prisma` | PaymentAttempt, Order, Listing (quantityPacks, reservedQty, isActive), WantedOffer, Refund, StripeEvent; OrderStatus, OrderSource enums |

### Other (reference)
| Path | Purpose |
|------|--------|
| `app/api/admin/reconciliation/route.ts` | GET: admin; compare orders (STRIPE) to Stripe PaymentIntent status/amount (uses float recompute for expected total, not totalChargedCents) |

---

## SECTION 2 — Function inventory

### app/api/stripe/create-payment-intent/route.ts
| Function | Description |
|----------|-------------|
| `resolveExistingWantedOfferAttempt` | Returns clientSecret if attempt PAYMENT_INTENT_CREATED + has PI + !expired; else 409 or marks EXPIRED and returns 400 |
| `resolveExistingListingAttempt` | Returns clientSecret if ACTIVE + has PI + !expired; else expires if ACTIVE+expired, or 409 if ACTIVE+no PI; else 400 |
| `POST` | Auth + body parse; wanted-offer branch: quote, idempotency, create attempt (no reservation), Stripe PI, update attempt; listing branch: quote, idempotency, tx(create attempt + reservedQty increment), Stripe PI, update attempt; on Stripe error (listing) releases reservation |

### app/api/stripe/webhook/route.ts
| Function | Description |
|----------|-------------|
| `parsedFromListingAttempt` | Build ParsedPayment from listing PaymentAttempt snapshot (cents→dollars) |
| `buildParsedPaymentFromAttempt` | Build ParsedPayment from any attempt snapshot (listing or wanted-offer) |
| `persistStripeEvent` | Upsert StripeEvent by eventId; return existing or created row + processingStatus |
| `processSuccessfulListingPayment` | In one tx: order by piId; if exists+inventoryApplied→PROCESSED+alreadyProcessed; if exists+!inventoryApplied→repair (listing qty/reservedQty/tradeCount, inventoryApplied); else create Order, decrement listing, tradeCount, inventoryApplied, PROCESSED, PAID/CONSUMED |
| `processSuccessfulWantedOfferPayment` | In one tx: same pattern; no listing; inventoryApplied = tradeCount + event applied |
| `POST` | Verify signature, persist event; if PROCESSED/FAILED return 200; else processStripeEventPayload; on error mark FAILED |
| `processStripeEventPayload` | payment_intent.succeeded: load attempt by piId; listing→processSuccessfulListingPayment then post-commit (sendNewSale, sendPurchaseConfirmed, generateInvoicePDF); wanted-offer→processSuccessfulWantedOfferPayment + same post-commit; payment_failed/canceled: tx(release reservation, attempt→FAILED/CANCELED), mark event PROCESSED; dispute created/updated→order DISPUTED; dispute closed→DISPUTE_LOST/PAID; account.updated→pharmacy stripeChargesEnabled/stripePayoutsEnabled |

### app/api/orders/[id]/refund/route.ts
| Function | Description |
|----------|-------------|
| `sanitizeIdempotencyKey` | Strip invalid chars, max 255 for Stripe |
| `POST` | Admin; load order; reject if no stripePaymentId or already REFUNDED/REFUNDED_FULL/REFUNDED_PARTIAL; totalChargedCents from order or float recompute; chargeModel from order (direct→503); Stripe refund (idempotencyKey); tx(Refund, order status, listing quantity+isActive if full refund listing order) |

### lib/listing-reservation.ts
| Function | Description |
|----------|-------------|
| `releaseListingReservationIfActive` | Find attempt by id or piId; if ACTIVE decrement listing.reservedQty, set reservationStatus RELEASED/EXPIRED; idempotent |
| `expireListingReservationIfActive` | Calls release; then sets PaymentAttempt.status EXPIRED if not already terminal |
| `findStaleListingReservations` | PaymentAttempts: listingId not null, ACTIVE, status not PAID, (expired or terminal status) |
| `repairStaleListingReservations` | For each stale, tx(expireListingReservationIfActive); return counts and errors |

### lib/pricing.ts
| Function | Description |
|----------|-------------|
| `calculateListingQuote` | gross, delivery, platform fee, tax (getTaxClassification+calculateGst), totalCharged, netToSeller; returns ListingQuote with cents |
| `calculateQuote` | Legacy: always 10% GST |

### lib/tax.ts
| Function | Description |
|----------|-------------|
| `getTaxClassification` | isGstFreeOverride true→GST_FREE, false→TAXABLE, else REVIEW_REQUIRED (0%) |
| `calculateGst` | subtotalExGst * taxResult.rate |

### lib/platform-fee.ts
| Function | Description |
|----------|-------------|
| `calculatePlatformFee` | max(grossAmount * 3.5%, $1.50) |

### lib/destination-charge.ts
| Function | Description |
|----------|-------------|
| `calculateDestinationChargeAmounts` | applicationFeeAmountCents = platformFeeCents; transferToSellerCents = totalChargedCents - applicationFeeAmountCents; chargeModel "destination" |

### lib/stripe-charge-model.ts
| Function | Description |
|----------|-------------|
| `getChargeModel` | Returns "destination"; throws DirectChargeNotSupportedError if STRIPE_USE_DIRECT_CHARGES=true |

### app/api/admin/repair-stale-reservations/route.ts
| Function | Description |
|----------|-------------|
| `GET` | Admin; return findStaleListingReservations() |
| `POST` | Admin; return repairStaleListingReservations() |

### app/api/admin/stripe-retry-failed/route.ts
| Function | Description |
|----------|-------------|
| `runRetryBatch` | Load FAILED/PENDING events (backoff, max retries); parse payload; increment retryCount; call processStripeEventPayload; mark PROCESSED/FAILED |
| `GET` | With ?run=1 or Vercel Cron: run batch; else list eligible |
| `POST` | Run batch (admin/CRON_SECRET) |

### app/api/orders/[id]/status/route.ts
| Function | Description |
|----------|-------------|
| `PUT` | Seller: PAID→SHIPPED (tracking/courier); Buyer: SHIPPED→DELIVERED; sendOrderShipped on SHIPPED |

### lib/resend.ts (relevant)
| Function | Description |
|----------|-------------|
| `sendNewSale` | Email seller: productName, buyerName, orderRef |
| `sendPurchaseConfirmed` | Email buyer with optional invoice PDF attachment |

### lib/invoice-pdf-server.ts
| Function | Description |
|----------|-------------|
| `generateInvoicePDF` | Build PDF from OrderForInvoice (order amounts, listing/product, buyer/seller); uses finalized order data only |

---

## SECTION 3 — End-to-end flow map

### A. Listing purchase

1. **Checkout entry:** Buyer opens BuyNowModal → selects quantity/delivery → `POST /api/stripe/create-payment-intent` with `listingId`, `quantity`, `deliveryFee`, `idempotencyKey` (e.g. `pi-${listing.id}-${quantity}-${deliveryFeeExGst}`).
2. **Create payment intent (listing):** Session + pharmacy verified; load listing (isActive); seller Stripe account check; `calculateListingQuote` → `calculateDestinationChargeAmounts`; `getChargeModel()`; idempotency: find existing attempt by idempotencyKey → if present, `resolveExistingListingAttempt` (return clientSecret or 400/409). If no existing: **transaction:** re-check listing availability, create PaymentAttempt (QUOTED, ACTIVE), increment listing.reservedQty; commit. Then create Stripe PaymentIntent (amount, application_fee_amount, transfer_data.destination, metadata); update PaymentAttempt (stripePaymentIntentId, PAYMENT_INTENT_CREATED). On Stripe error: **transaction:** releaseListingReservationIfActive(createdAttemptId). P2002 on create → re-fetch attempt, resolveExistingListingAttempt.
3. **Client:** Stripe Elements confirmPayment → redirect to return_url.
4. **Webhook:** Stripe sends payment_intent.succeeded. persistStripeEvent; processStripeEventPayload: find PaymentAttempt by piId (listingId set); **transaction (processSuccessfulListingPayment):** find Order by stripePaymentId(piId). If order exists + inventoryApplied → mark event PROCESSED, attempt PAID/CONSUMED, return alreadyProcessed. If order exists + !inventoryApplied → repair (decrement listing quantityPacks/reservedQty, tradeCount, set inventoryApplied, PROCESSED, PAID/CONSUMED). If no order: create Order (totalChargedCents, chargeModel from attempt), decrement listing quantityPacks/reservedQty, set isActive from new qty, tradeCount+1, set inventoryApplied true, PROCESSED, PAID/CONSUMED. **Post-commit (only when !alreadyProcessed):** sendNewSale(seller), load order+listing+buyer+seller, generateInvoicePDF, sendPurchaseConfirmed(buyer, with PDF).
5. **Failure/cancel:** payment_intent.payment_failed or payment_intent.canceled → **transaction:** releaseListingReservationIfActive(piId), attempt status FAILED/CANCELED; mark event PROCESSED.
6. **Expiry:** Listing reservation expires at expiresAt (30 min). Client re-request with same idempotencyKey → resolveExistingListingAttempt sees ACTIVE+expired → expireListingReservationIfActive → 400. Stale repair job: findStaleListingReservations → repairStaleListingReservations (expire each).

### B. Wanted-offer purchase

1. **Checkout entry:** Buyer on PayAcceptedOfferClient → `POST /api/stripe/create-payment-intent` with `wantedOfferId`, `idempotencyKey` (e.g. `pi-wanted-${offer.id}-${deliveryFeeExGST}`).
2. **Create payment intent (wanted-offer):** Load wanted offer (status ACCEPTED); buyer = wantedItem owner; seller Stripe account check; manual quote (gross, delivery, getTaxClassification(null), calculateGst, totalCharged, platformFee, netToSeller); `calculateDestinationChargeAmounts`; `getChargeModel()`; idempotency: find existing by idempotencyKey → resolveExistingWantedOfferAttempt (return clientSecret or 400/409). If no existing: create PaymentAttempt (no listing, reservationStatus N/A); create Stripe PaymentIntent; update attempt (stripePaymentIntentId, PAYMENT_INTENT_CREATED). P2002 → re-fetch, resolveExistingWantedOfferAttempt.
3. **Client:** confirmPayment → return_url.
4. **Webhook:** payment_intent.succeeded; find attempt by piId (wantedOfferId set); **transaction (processSuccessfulWantedOfferPayment):** same idempotency/repair pattern (order by piId, inventoryApplied); create Order (wantedOfferId, totalChargedCents, chargeModel); tradeCount+1; set inventoryApplied; PROCESSED; PAID/CONSUMED. **Post-commit (!alreadyProcessed):** sendNewSale, generateInvoicePDF (wantedOffer.wantedItem), sendPurchaseConfirmed.
5. **Failure/cancel:** Same webhook path; releaseListingReservationIfActive is no-op for wanted-offer (no listingId); attempt status FAILED/CANCELED.

---

## SECTION 4 — Transaction boundary map

| Step | In transaction? | Notes |
|------|------------------|--------|
| Create listing attempt + reserve | Yes | `prisma.$transaction`: create PaymentAttempt, increment listing.reservedQty. Atomicity: no double reserve for same idempotencyKey (unique); quantity check inside tx. |
| Create wanted-offer attempt | No | Single PaymentAttempt.create (no reservation). P2002 handled by re-fetch + resolve. |
| Stripe PI create | No | After DB commit (listing) or after create (wanted). Listing: if Stripe fails, separate tx releases reservation. |
| Webhook: processSuccessfulListingPayment | Yes | Single `prisma.$transaction`: order lookup/create, listing update, pharmacy tradeCount, order inventoryApplied, StripeEvent PROCESSED, PaymentAttempt PAID/CONSUMED. All or nothing. |
| Webhook: processSuccessfulWantedOfferPayment | Yes | Single `prisma.$transaction`: same pattern without listing. |
| Webhook: payment_failed / canceled | Yes | `prisma.$transaction`: releaseListingReservationIfActive(piId), attempt status update. Then event marked PROCESSED outside (separate update). |
| Post-commit notifications / invoice | No | Intentionally after commit; failures do not roll back order. |
| Refund POST | Partial | Stripe refund outside tx; then single `prisma.$transaction`: Refund create, order status, listing quantity+isActive (if full refund listing). |
| repairStaleListingReservations | Per attempt | Each stale attempt: one `prisma.$transaction(expireListingReservationIfActive)`. |
| expireListingReservationIfActive | Yes | Uses tx; internally releaseListingReservationIfActive(tx). |

**Atomicity relied upon:**
- Listing: (PaymentAttempt create + reservedQty increment) in one tx so reserve is never leaked without an attempt.
- Webhook success: (Order create/repair + listing qty + reservedQty + tradeCount + inventoryApplied + event + attempt) in one tx so no double inventory decrement or double tradeCount.
- Refund: (Refund + order status + listing restore) in one tx so state is consistent after Stripe refund (Stripe call is idempotent by key).

---

## SECTION 5 — Money source-of-truth map

| Field | Source of truth | Where persisted | Listing vs wanted-offer |
|-------|------------------|-----------------|--------------------------|
| grossAmount / grossAmountCents | Listing: `calculateListingQuote` (from unitPriceExGst × quantity). Wanted: offer.pricePerPack × offer.quantity. | PaymentAttempt.grossAmountCents; Order has grossAmount (float) from ParsedPayment (attempt snapshot at success). | Aligned: listing uses pricing.ts; wanted uses same platform fee/tax pattern and destination-charge. |
| deliveryFee / deliveryFeeExGstCents | Request body (listing: override or listing.deliveryFee). Wanted: body deliveryFeeOverride or 0. | PaymentAttempt.deliveryFeeExGstCents; Order.deliveryFee (from attempt snapshot). | Aligned. |
| platformFee / platformFeeCents | `calculatePlatformFee(grossAmount)` (lib/platform-fee). | PaymentAttempt.platformFeeCents; Order.platformFee. | Aligned. |
| gstAmount / gstAmountCents | Listing: `getTaxClassification(isGstFree)` + `calculateGst(subtotalExGst, taxResult)`. Wanted: getTaxClassification(null) → REVIEW_REQUIRED (0%). | PaymentAttempt.gstAmountCents; Order.gstAmount. | Listing uses listing.isGstFree; wanted currently 0% until classification. |
| netToSeller / netToSellerCents | grossAmount - platformFee + deliveryFeeExGst. | PaymentAttempt.netToSellerCents; Order.netAmount. | Aligned. |
| totalChargedCents | Listing: quote.totalChargedCents (from calculateListingQuote); then destination-charge uses that. Wanted: destAmounts.buyerTotalCents from calculateDestinationChargeAmounts. | PaymentAttempt.totalChargedCents at create; Order.totalChargedCents at webhook (from attempt). Refund uses Order.totalChargedCents (or float recompute for legacy). | Aligned; both go through calculateDestinationChargeAmounts. |
| chargeModel | getChargeModel() → "destination" (or throw). | PaymentAttempt.chargeModel at create; Order.chargeModel at webhook. Refund reads Order.chargeModel (direct → 503). | Aligned. |
| application_fee_amount | `calculateDestinationChargeAmounts` → applicationFeeAmountCents = platformFeeCents. | Not stored in DB; sent to Stripe PaymentIntent only. | Aligned; destination-charge helper only. |

---

## SECTION 6 — Status / lifecycle map

### PaymentAttempt
- **status:** QUOTED → PAYMENT_INTENT_CREATED → (PAID | EXPIRED | FAILED | CANCELED).
- **reservationStatus:** ACTIVE (listing only) → CONSUMED (on success) or RELEASED/EXPIRED (on release/expire). Wanted-offer uses "N/A" (no reservation).

### reservationStatus (listing)
- ACTIVE: reservedQty incremented, attempt not yet terminal.
- CONSUMED: payment succeeded; reservedQty decremented in same tx as quantityPacks.
- RELEASED: released manually or by payment_failed/canceled.
- EXPIRED: time past expiresAt or explicit expire.

### Listing
- **quantityPacks:** Decremented only in webhook success tx (or repair path) by order quantity.
- **reservedQty:** Incremented in create-payment-intent tx; decremented in webhook success (consume) or release/expire.
- **isActive:** Set to (new quantityPacks > 0) in webhook success (and in refund full-restore).

### WantedOffer
- **status:** PENDING | ACCEPTED | DECLINED. Payment flow only uses ACCEPTED offers; no status change in webhook (order is the record).

### Order
- **status:** PENDING → PAID (webhook) → SHIPPED (seller) → DELIVERED (buyer); or DISPUTED → DISPUTE_LOST/PAID; or REFUNDED_FULL/REFUNDED_PARTIAL (refund route).
- **inventoryApplied:** false on create; set true in same tx after listing decrement + tradeCount (listing) or tradeCount only (wanted). Idempotency: existing order + inventoryApplied true → alreadyProcessed.

### StripeEvent
- **processingStatus:** PENDING → PROCESSED (success) or FAILED (on throw). Retry job can move FAILED/PENDING to PROCESSED on success.

---

## SECTION 7 — Risk scan

| # | Classification | Evidence / description |
|---|----------------|------------------------|
| 1 | **Low** | Reconciliation GET uses float recompute `(order.grossAmount + order.deliveryFee + order.gstAmount) * 100` for expected Stripe amount, not `order.totalChargedCents`. For orders with totalChargedCents set, a rounding difference could cause a false "amount mismatch" in the admin report. Not a correctness bug for payment/refund. |
| 2 | **Low** | Wanted-offer idempotency key from client uses `deliveryFeeExGST` (number). If client sends different float representation (e.g. 10 vs 10.0), key could differ and create a second attempt. Mitigated by server using the same value for the attempt; key is best generated server-side or normalized. |
| 3 | **Low** | payment_failed/canceled webhook: StripeEvent is marked PROCESSED in a separate update after the release tx. If process crashes between tx commit and event update, retry could run release again (idempotent) and then mark PROCESSED. No double-release because releaseListingReservationIfActive is idempotent. |
| 4 | **Medium** | Refund route: Stripe refund is created **before** the DB transaction. If DB tx fails after Stripe refund succeeds, order/listing state is inconsistent (Stripe has refund, DB does not). Mitigated by idempotency key on Stripe so retry reuses same refund and tx can then succeed. If tx never succeeds, operational repair (manual or script) may be needed. |
| 5 | **Low** | Invoice PDF for wanted-offer uses `listing: { productName, strength, packSize }` shape from wantedItem; Order.netAmount etc. come from attempt snapshot. No separate risk identified; data is from committed order. |
| 6 | **Low** | OrderStatus enum includes both REFUNDED and REFUNDED_FULL/REFUNDED_PARTIAL. Refund route rejects all three. If legacy data used REFUNDED, it is correctly blocked from double refund. |

No **Critical** items identified. All critical paths (create attempt + reserve, webhook success tx, refund tx) use transactions and idempotency where required.

---

## SECTION 8 — Final review package (manual inspection checklist)

Priority order for manual code review:

1. **app/api/stripe/create-payment-intent/route.ts**
   - Lines ~393–419: Listing tx (create PaymentAttempt + reservedQty increment); confirm quantity check and that P2002 path does not double-reserve.
   - Lines ~364–391: Idempotency + resolveExistingListingAttempt before tx; confirm 409/400 semantics.
   - Lines ~456–462: Stripe error path: releaseListingReservationIfActive(createdAttemptId) in tx.

2. **app/api/stripe/webhook/route.ts**
   - Lines ~138–261: processSuccessfulListingPayment full tx (order exists + inventoryApplied → alreadyProcessed; exists + !inventoryApplied → repair; else create Order + listing decrement + tradeCount + inventoryApplied).
   - Lines ~274–385: processSuccessfulWantedOfferPayment full tx (same idempotency/repair pattern).
   - Lines ~431–453: payment_failed/canceled tx (release + attempt status); confirm event PROCESSED update after.

3. **app/api/orders/[id]/refund/route.ts**
   - Lines ~64–73: totalChargedCents and refund amount validation; chargeModel direct → 503.
   - Lines ~114–141: Single transaction: Refund create, order status, listing restore (full refund + listing order only).

4. **lib/listing-reservation.ts**
   - releaseListingReservationIfActive: reservedQty decrement with Math.max(0, …); reservationStatus update; idempotent when not ACTIVE.

5. **lib/destination-charge.ts**
   - applicationFeeAmountCents = platformFeeCents only; no GST in application_fee.

6. **lib/pricing.ts** and **lib/tax.ts**
   - calculateListingQuote uses getTaxClassification(isGstFree) and calculateGst; wanted-offer path uses getTaxClassification(null) (REVIEW_REQUIRED).

7. **app/api/admin/stripe-retry-failed/route.ts**
   - runRetryBatch: backoff and retry count; processStripeEventPayload same as webhook; no duplicate event processing because persistStripeEvent already done and event row exists (retry reuses payload from DB).

8. **Idempotency key usage**
   - BuyNowModal: `pi-${listing.id}-${quantity}-${deliveryFeeExGst}`.
   - PayAcceptedOfferClient: `pi-wanted-${offer.id}-${deliveryFeeExGST}`.
   - Refund: header Idempotency-Key or `refund-${orderId}-${refundAmountCents}`.

---

*End of audit pack. No code changes recommended in this document.*
