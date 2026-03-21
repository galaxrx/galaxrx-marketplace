# GalaxRX Stripe / Finance Hardening — Final Audit (Review Only)

**Scope:** Audit-only. No code changes. Exhaustive collection and summary of code paths for transaction boundaries, financial flow, and product/listing status flow.

---

## SECTION 1 — File inventory

### Create / checkout
| Path | Purpose |
|------|--------|
| `app/api/stripe/create-payment-intent/route.ts` | Single POST handler: listing and wanted-offer create PaymentIntent; idempotency; reservation; P2002 retry; expiry. |
| `components/listings/BuyNowModal.tsx` | Listing checkout UI: calls create-payment-intent with `listingId`, `quantity`, `deliveryFee`, `idempotencyKey`; uses `calculateListingQuote`. |
| `components/wanted/PayAcceptedOfferClient.tsx` | Wanted-offer pay UI: calls create-payment-intent with `wantedOfferId`, `deliveryFee` (no client idempotencyKey). |
| `app/(dashboard)/wanted/offer/[offerId]/pay/page.tsx` | Server page: loads ACCEPTED offer and renders PayAcceptedOfferClient. |

### Webhook / finalization
| Path | Purpose |
|------|--------|
| `app/api/stripe/webhook/route.ts` | Stripe webhook POST: persist event; payment_intent.succeeded (listing + wanted-offer); payment_failed/canceled (release reservation); dispute events; account.updated. |

### Pricing / tax / charge
| Path | Purpose |
|------|--------|
| `lib/pricing.ts` | `calculateListingQuote`, `calculateQuote`; gross, delivery, GST, platform fee, total, net (cents). |
| `lib/tax.ts` | `getTaxClassification`, `calculateGst`; GST_RATE; TAXABLE / GST_FREE / REVIEW_REQUIRED. |
| `lib/platform-fee.ts` | `calculatePlatformFee`; PLATFORM_FEE_PERCENT, MIN_PLATFORM_FEE. |
| `lib/destination-charge.ts` | `calculateDestinationChargeAmounts`; application_fee_amount = platform fee only. |
| `lib/stripe-charge-model.ts` | `getChargeModel`, `DirectChargeNotSupportedError`; destination only, direct disabled. |
| `lib/stripe.ts` | Stripe client; re-exports `calculatePlatformFee`, GST_RATE, platform-fee constants. |

### Refunds
| Path | Purpose |
|------|--------|
| `app/api/orders/[id]/refund/route.ts` | Admin-only POST: refund via Stripe; uses order.totalChargedCents/chargeModel; creates Refund; updates Order; restores listing qty on full refund. |

### Inventory / reservation / status
| Path | Purpose |
|------|--------|
| `lib/listing-reservation.ts` | `releaseListingReservationIfActive`, `expireListingReservationIfActive`, `findStaleListingReservations`, `repairStaleListingReservations`; RESERVATION_STATUS. |
| `app/api/admin/repair-stale-reservations/route.ts` | Admin GET/POST: list stale reservations; run repair (calls lib repairStaleListingReservations). |
| `app/api/orders/[id]/status/route.ts` | Seller/buyer: PUT order status SHIPPED/DELIVERED; transitions PAID → SHIPPED → DELIVERED. |

### Operational outputs (order finalization correctness)
| Path | Purpose |
|------|--------|
| `lib/resend.ts` | `sendNewSale`, `sendPurchaseConfirmed` (used after webhook success; post-commit). |
| `lib/invoice-pdf-server.ts` | `generateInvoicePDF(OrderForInvoice)`; used in webhook after order created (listing + wanted-offer). |

### Schema / data model
| Path | Purpose |
|------|--------|
| `prisma/schema.prisma` | PaymentAttempt, Order, Refund, StripeEvent, Listing (reservedQty, isActive), WantedOffer (status). |

### Wanted-offer status (pre-payment)
| Path | Purpose |
|------|--------|
| `app/api/wanted/[id]/offers/[offerId]/route.ts` | PATCH accept/decline: sets WantedOffer.status to ACCEPTED or DECLINED. |

---

## SECTION 2 — Function inventory

### app/api/stripe/create-payment-intent/route.ts
| Function | Description |
|----------|-------------|
| `resolveExistingWantedOfferAttempt(attempt, stripe)` | Returns response for existing wanted-offer attempt: reuse PI if PAYMENT_INTENT_CREATED + PI + !expired; 409 if in-progress no PI; else mark expired and 400. |
| `resolveExistingListingAttempt(attempt, stripe)` | Returns response for existing listing attempt: reuse if ACTIVE + PI + !expired; expire in tx if ACTIVE + expired; 409 if ACTIVE + no PI; else 400. |
| `POST` | Main handler: auth; listing vs wantedOfferId branch; idempotency; listing: tx create attempt + reserve; Stripe PI create; on Stripe error release reservation. Wanted: create attempt then PI; P2002 retry both paths. |

### app/api/stripe/webhook/route.ts
| Function | Description |
|----------|-------------|
| `persistStripeEvent(event)` | Upsert StripeEvent by eventId; return id + processingStatus; PENDING if new. |
| `parsedFromListingAttempt(attempt)` | Build ParsedPayment from listing PaymentAttempt snapshot (cents → dollars). |
| `buildParsedPaymentFromAttempt(attempt)` | Build ParsedPayment from any attempt (listing or wanted) snapshot. |
| `processSuccessfulListingPayment(eventId, piId, listingId, parsed, chargeModel, totalChargedCents)` | One tx: find order by piId; if exists + inventoryApplied → mark event PROCESSED, return alreadyProcessed; if exists + !inventoryApplied → repair (listing qty, reservedQty, tradeCount, inventoryApplied); else create order, decrement listing, tradeCount, event PROCESSED, attempt PAID/CONSUMED. Persists totalChargedCents + chargeModel on Order. |
| `processSuccessfulWantedOfferPayment(eventId, piId, wantedOfferId, parsed, chargeModel, totalChargedCents)` | One tx: find order by piId; if exists + inventoryApplied → PROCESSED, return; if exists + !inventoryApplied → repair (tradeCount, inventoryApplied); else create order, tradeCount, inventoryApplied. Persists totalChargedCents + chargeModel on Order. |
| `POST` | Verify signature; persist event; if PROCESSED/FAILED return 200; payment_intent.succeeded: load attempts by piId, single attempt; listing path → processSuccessfulListingPayment then post-commit (sendNewSale, sendPurchaseConfirmed, generateInvoicePDF); wanted path → processSuccessfulWantedOfferPayment then post-commit; payment_failed/canceled → tx release reservation + attempt status FAILED/CANCELED; dispute created/updated/closed; account.updated. |

### app/api/orders/[id]/refund/route.ts
| Function | Description |
|----------|-------------|
| `POST` | Admin only; load order; validate stripePaymentId, not already REFUNDED_*; totalChargedCents from order or recompute; refundAmountCents ≤ totalChargedCents; chargeModel from order (destination only); stripe.refunds.create (refund_application_fee, reverse_transfer); create Refund; order status REFUNDED_FULL or REFUNDED_PARTIAL; if STRIPE + listingId + REFUNDED_FULL → listing quantityPacks += order.quantity, isActive true. |

### lib/pricing.ts
| Function | Description |
|----------|-------------|
| `calculateListingQuote(input)` | Authoritative listing quote: gross, platformFee, subtotalExGst, gstAmount (tax classification), totalCharged, netToSeller; returns dollars + cents + taxClassification. |
| `calculateQuote(input)` | Legacy: always 10% GST. |

### lib/tax.ts
| Function | Description |
|----------|-------------|
| `getTaxClassification(params)` | isGstFreeOverride true → GST_FREE; false → TAXABLE; else REVIEW_REQUIRED (10%). |
| `calculateGst(subtotalExGst, taxResult)` | subtotal * taxResult.rate. |

### lib/destination-charge.ts
| Function | Description |
|----------|-------------|
| `calculateDestinationChargeAmounts(input)` | applicationFeeAmountCents = platformFeeCents; transferToSellerCents = totalChargedCents - applicationFeeAmountCents; chargeModel "destination". |

### lib/stripe-charge-model.ts
| Function | Description |
|----------|-------------|
| `getChargeModel()` | Returns "destination"; throws if STRIPE_USE_DIRECT_CHARGES=true. |

### lib/listing-reservation.ts
| Function | Description |
|----------|-------------|
| `releaseListingReservationIfActive(tx, params)` | Find attempt by paymentAttemptId or stripePaymentIntentId; if listing and ACTIVE: decrement listing.reservedQty, set reservationStatus RELEASED/EXPIRED. |
| `expireListingReservationIfActive(tx, params)` | Calls release; then if released and expiresAt passed set attempt status EXPIRED if not terminal. |
| `findStaleListingReservations()` | PaymentAttempts: listingId not null, reservationStatus ACTIVE, status not PAID, (expiresAt < now or status in FAILED/EXPIRED/CANCELED). |
| `repairStaleListingReservations()` | For each stale, tx expireListingReservationIfActive; return processed/released/errors. |

### lib/platform-fee.ts
| Function | Description |
|----------|-------------|
| `calculatePlatformFee(grossAmount)` | max(grossAmount * 3.5%, 1.50). |

### lib/stripe.ts
| Function | Description |
|----------|-------------|
| `calculatePlatformFee(grossAmount)` | Re-export from platform-fee. |

### lib/invoice-pdf-server.ts
| Function | Description |
|----------|-------------|
| `generateInvoicePDF(order)` | Build PDF from order (listing or wanted shape); used with finalized order data after webhook. |

### lib/resend.ts (relevant)
| Function | Description |
|----------|-------------|
| `sendNewSale(email, productName, buyerName, orderRef)` | Seller “you sold” email. |
| `sendPurchaseConfirmed(email, orderId, options)` | Buyer confirmation + optional invoice PDF. |

### app/api/admin/repair-stale-reservations/route.ts
| Function | Description |
|----------|-------------|
| `GET` | Admin: return findStaleListingReservations(). |
| `POST` | Admin: return repairStaleListingReservations(). |

### app/api/orders/[id]/status/route.ts
| Function | Description |
|----------|-------------|
| `PUT` | Seller: PAID → SHIPPED (tracking); Buyer: SHIPPED → DELIVERED. Sends sendOrderShipped when SHIPPED. |

### app/api/wanted/[id]/offers/[offerId]/route.ts
| Function | Description |
|----------|-------------|
| `PATCH` | Accept/decline offer: WantedOffer.status = ACCEPTED | DECLINED; sendOfferAccepted email on accept. |

---

## SECTION 3 — End-to-end flow map

### A. Listing purchase
1. **UI:** Buyer opens BuyNowModal with listing + quantity; selects delivery (standard/express or AusPost); `calculateListingQuote(unitPriceExGst, quantity, deliveryFeeExGst, isGstFree)` for display.
2. **Create PI:** POST /api/stripe/create-payment-intent with `{ listingId, quantity, deliveryFee, idempotencyKey }` (idempotencyKey = `pi-${listing.id}-${quantity}-${deliveryFeeExGst}`).
3. **Server create-payment-intent:** Auth + verified pharmacy; load listing (isActive); seller stripeAccountId; getChargeModel() (destination only); calculateListingQuote (same inputs as UI); calculateDestinationChargeAmounts; look up existing attempt by idempotencyKey → resolveExistingListingAttempt (reuse or 409/400).
4. **Reserve:** In transaction: check available = quantityPacks - reservedQty ≥ quantity; create PaymentAttempt (QUOTED, reservationStatus ACTIVE), increment listing.reservedQty; return attempt.id. On P2002: re-fetch by idempotencyKey, resolveExistingListingAttempt.
5. **Stripe:** stripe.paymentIntents.create(amount, application_fee_amount, transfer_data.destination, metadata); then update attempt (stripePaymentIntentId, status PAYMENT_INTENT_CREATED). On Stripe error: tx releaseListingReservationIfActive(createdAttemptId).
6. **Client:** Elements + confirmPayment; redirect to /orders?success=true.
7. **Webhook payment_intent.succeeded:** persistStripeEvent; find PaymentAttempt by stripePaymentIntentId; single attempt with listingId; parsedFromListingAttempt; processSuccessfulListingPayment (one tx: order by piId; if exists + inventoryApplied → PROCESSED; if exists + !inventoryApplied → repair listing qty/reservedQty/tradeCount; else create Order, decrement listing quantityPacks/reservedQty, isActive if 0, tradeCount, StripeEvent PROCESSED, attempt PAID/CONSUMED; order.totalChargedCents + chargeModel persisted).
8. **Post-commit (outside tx):** sendNewSale(seller), sendPurchaseConfirmed(buyer) + generateInvoicePDF (from DB order), attach PDF.

### B. Wanted-offer purchase
1. **UI:** Buyer on /wanted/offer/[offerId]/pay; PayAcceptedOfferClient: totalCharged = gross + 0 delivery + 10% GST (client-side display only; server recalculates).
2. **Create PI:** POST /api/stripe/create-payment-intent with `{ wantedOfferId, deliveryFee: 0 }` (no idempotencyKey in client — server generates `pi-${Date.now()}-${random}` if omitted).
3. **Server create-payment-intent:** Auth; load WantedOffer (status ACCEPTED), wantedItem.pharmacyId = buyerId, seller.stripeAccountId; seller account health; pricing: grossAmount = pricePerPack * quantity, deliveryFee 0, getTaxClassification(null), calculateGst, totalCharged, platformFee, netToSeller; calculateDestinationChargeAmounts; getChargeModel(); look up existing by idempotencyKey → resolveExistingWantedOfferAttempt.
4. **Create attempt:** Create PaymentAttempt (no listingId, wantedOfferId set, reservationStatus N/A, status QUOTED); stripe.paymentIntents.create; update attempt (stripePaymentIntentId, status PAYMENT_INTENT_CREATED). On P2002: re-fetch, resolveExistingWantedOfferAttempt.
5. **Client:** confirmPayment; redirect /orders?success=true.
6. **Webhook payment_intent.succeeded:** single attempt with wantedOfferId; buildParsedPaymentFromAttempt; processSuccessfulWantedOfferPayment (one tx: order by piId; if exists + inventoryApplied → PROCESSED; if exists + !inventoryApplied → repair tradeCount + inventoryApplied; else create Order, tradeCount, inventoryApplied, PROCESSED). totalChargedCents + chargeModel on Order.
7. **Post-commit:** sendNewSale, sendPurchaseConfirmed + generateInvoicePDF (wantedOffer.wantedItem shape).

---

## SECTION 4 — Transaction boundary map

| Step | In DB transaction? | Notes |
|------|--------------------|--------|
| Create listing attempt + reserve qty | Yes | `prisma.$transaction`: create PaymentAttempt, increment listing.reservedQty. |
| Create wanted attempt | No | Single prisma.paymentAttempt.create (no inventory to reserve). |
| Stripe PI create | No | External API. |
| Update attempt with stripePaymentIntentId | No | After PI create (listing: if this fails, reservation already committed; wanted: no reservation). |
| Release reservation on Stripe error (listing) | Yes | `prisma.$transaction(releaseListingReservationIfActive)`. |
| resolveExistingListingAttempt — expire | Yes | `prisma.$transaction(expireListingReservationIfActive)`. |
| persistStripeEvent | No | Single findUnique + create. |
| processSuccessfulListingPayment (full path) | Yes | Single `prisma.$transaction`: order create/repair, listing update, pharmacy tradeCount, order inventoryApplied, StripeEvent PROCESSED, PaymentAttempt PAID/CONSUMED. |
| processSuccessfulWantedOfferPayment (full path) | Yes | Single `prisma.$transaction`: order create/repair, pharmacy tradeCount, order inventoryApplied, StripeEvent PROCESSED. |
| payment_failed / canceled | Yes | `prisma.$transaction(releaseListingReservationIfActive)` + attempt status update. |
| Post-commit emails + PDF | No | Intentionally after tx; failures log, do not roll back order. |
| Refund route: create Refund + order update + listing restore | No | Three separate writes (not one tx). |
| repairStaleListingReservations (per attempt) | Yes | Each `prisma.$transaction(expireListingReservationIfActive)`. |

**Atomicity relied upon:**
- Listing: attempt create + reservedQty increment in one tx (no double reserve / oversell).
- Success path: order + listing qty + reservedQty + tradeCount + event + attempt in one tx (no partial success).
- Wanted: order + tradeCount + event in one tx.
- Failure/cancel: release reservation + attempt status in one tx.

---

## SECTION 5 — Money source-of-truth map

| Field | Source of truth | Where persisted | Listing vs wanted-offer |
|-------|-----------------|------------------|---------------------------|
| grossAmount / grossAmountCents | pricing (listing: calculateListingQuote; wanted: manual gross = pricePerPack * qty in route) | PaymentAttempt.grossAmountCents; Order (grossAmount float from parsed) | Listing: from quote. Wanted: from offer in create-payment-intent. |
| deliveryFee / deliveryFeeExGstCents | Listing: from listing.deliveryFee or override. Wanted: 0 or override. | PaymentAttempt.deliveryFeeExGstCents; Order.deliveryFee | Aligned (both in attempt and order). |
| platformFee / platformFeeCents | calculatePlatformFee(grossAmount) in pricing (listing) or in create-payment-intent (wanted) | PaymentAttempt.platformFeeCents; Order.platformFee | Same formula (lib/platform-fee). |
| gstAmount / gstAmountCents | calculateGst(subtotalExGst, getTaxClassification(...)) | PaymentAttempt.gstAmountCents; Order.gstAmount | Listing: listing.isGstFree. Wanted: getTaxClassification({ isGstFreeOverride: null }) → REVIEW_REQUIRED (10%). |
| netToSeller / netToSellerCents | gross - platformFee + deliveryFee (same in pricing and wanted path) | PaymentAttempt.netToSellerCents; Order.netAmount | Aligned. |
| totalChargedCents | Listing: quote.totalChargedCents (after destination-charge). Wanted: destAmounts.buyerTotalCents. | PaymentAttempt.totalChargedCents; Order.totalChargedCents (webhook from attempt) | Both persisted on attempt at create and on order at webhook; refund uses Order.totalChargedCents. |
| chargeModel | getChargeModel() → "destination"; destAmounts.chargeModel | PaymentAttempt.chargeModel; Order.chargeModel (webhook from attempt); refund uses Order.chargeModel | Aligned; destination only. |

**application_fee_amount semantics:** In destination-charge.ts, application_fee_amount = platformFeeCents only (not GST). Transfer to seller = buyerTotalCents - applicationFeeAmountCents. Listing and wanted-offer both use calculateDestinationChargeAmounts; aligned.

---

## SECTION 6 — Status / lifecycle map

### PaymentAttempt
- **status:** QUOTED → PAYMENT_INTENT_CREATED → PAID | FAILED | CANCELED | EXPIRED.
- **reservationStatus (listing):** ACTIVE → CONSUMED (on success) or RELEASED/EXPIRED (on release/expire). Wanted: N/A.
- **Note:** Listing success path updates attempt to PAID + CONSUMED in processSuccessfulListingPayment. Wanted-offer success path does not update PaymentAttempt to PAID in current code (see Risk #4).
- **Listing flow:** Reserve in tx (ACTIVE); success → PAID + CONSUMED; failed/canceled → FAILED/CANCELED + release → RELEASED/EXPIRED; expiry in resolveExisting → EXPIRED.
- **Wanted flow:** No reservation; QUOTED → PAYMENT_INTENT_CREATED → PAID | FAILED | CANCELED | EXPIRED.

### Listing
- **reservedQty:** Incremented in create-payment-intent tx (by quantity); decremented on release or on success (in processSuccessfulListingPayment).
- **quantityPacks:** Decremented in success tx only (by order qty).
- **isActive:** Set to (newQty > 0) in success tx; also set true on full refund (refund route).

### WantedOffer
- **status:** PENDING → ACCEPTED | DECLINED (PATCH offers/[offerId]). No further status change on payment; order links via wantedOfferId.

### Order
- **inventoryApplied:** false on create; set true in same tx after listing qty/tradeCount (listing) or tradeCount (wanted). Idempotent repair path sets true if order existed without it.
- **status:** PAID (webhook); then SHIPPED/DELIVERED (status route); REFUNDED_FULL | REFUNDED_PARTIAL (refund); DISPUTED / DISPUTE_LOST (dispute webhooks).

### Refund
- **Limit logic:** refundAmountCents ≤ order.totalChargedCents; full refund → REFUNDED_FULL and (if listing) restore quantityPacks.

---

## SECTION 7 — Risk scan

| # | Classification | Evidence |
|---|----------------|----------|
| 1 | **Low** | **Wanted-offer client does not send idempotencyKey.** PayAcceptedOfferClient POST body is `{ wantedOfferId, deliveryFee: 0 }`. Server generates `pi-${Date.now()}-${random}` when missing, so each page load/new mount can create a new PaymentAttempt and a new Stripe PI. No double-charge (Stripe idempotency is per key), but duplicate attempts in DB and possible confusion; reuse only works if client sends same key. |
| 2 | **Low** | **Wanted-offer client-side totalCharged uses hardcoded 10% GST.** PayAcceptedOfferClient: `gstAmount = subtotalExGST * 0.1`. Server uses getTaxClassification({ isGstFreeOverride: null }) → 10%. Currently aligned; if wanted-offer ever gets isGstFree, client display would be wrong until client uses same tax helper. |
| 3 | **Medium** | **Refund route: order update + Refund create + listing restore are not in one transaction.** If Refund create succeeds and order update or listing update fails, state can be inconsistent. Manual repair or idempotent retry would be needed. |
| 4 | **Low** | **processSuccessfulWantedOfferPayment does not update PaymentAttempt to PAID/CONSUMED.** In listing path, attempt is updated to PAID and reservationStatus CONSUMED inside the tx. In wanted-offer path, the transaction does not update PaymentAttempt (only Order, Pharmacy, StripeEvent). So wanted-offer PaymentAttempts can remain PAYMENT_INTENT_CREATED after successful payment. Listing path (lines 257–261) updates attempt; wanted path (processSuccessfulWantedOfferPayment) has no equivalent. **Evidence:** webhook/route.ts listing branch after tx does `paymentAttempt.updateMany({ where: { stripePaymentIntentId: piId }, data: { status: "PAID", reservationStatus: "CONSUMED" } })` inside processSuccessfulListingPayment; wanted-offer branch has no such update. So wanted-offer attempts are never marked PAID. |
| 5 | **Low** | **StripeEvent processingStatus FAILED:** On success-path throw, event is marked FAILED; retries are not automated. Manual or dashboard-driven retry would require idempotent handling (already present via order by piId + inventoryApplied). |

**Clarification on #4:** Re-reading webhook code: `processSuccessfulListingPayment` does update attempt inside the tx (lines 257–261). `processSuccessfulWantedOfferPayment` does NOT update PaymentAttempt to PAID anywhere. So for wanted-offer, the attempt status stays PAYMENT_INTENT_CREATED after success. This is a concrete inconsistency (medium impact for reporting/cleanup, low for money flow).

---

## SECTION 8 — Final review package (manual inspection checklist)

**Priority order:**

1. **app/api/stripe/create-payment-intent/route.ts**  
   - Lines 384–419: listing tx (create attempt + reserve); P2002 retry (414–419).  
   - Lines 366–371: idempotency lookup and resolveExistingListingAttempt.  
   - Lines 239–258: wanted-offer idempotency and resolveExistingWantedOfferAttempt.  
   - Lines 465–469: release on Stripe error (listing only).

2. **app/api/stripe/webhook/route.ts**  
   - Lines 147–264: processSuccessfulListingPayment (order create/repair, listing qty, reservedQty, tradeCount, inventoryApplied, attempt PAID/CONSUMED).  
   - Lines 286–377: processSuccessfulWantedOfferPayment (no PaymentAttempt status update — confirm intent).  
   - Lines 414–421: persistStripeEvent; early return if PROCESSED/FAILED.  
   - Lines 437–444: single attempt validation; failEvent if length > 1.  
   - Lines 404–411: payment_failed/canceled tx (release + attempt status).

3. **app/api/orders/[id]/refund/route.ts**  
   - Lines 56–65: totalChargedCents and refund amount validation.  
   - Lines 69–84: chargeModel from order; direct rejected.  
   - Lines 97–123: Refund create, order update, listing restore (no tx wrapper).

4. **lib/listing-reservation.ts**  
   - releaseListingReservationIfActive: reservedQty decrement and Math.max(0, ...).  
   - expireListingReservationIfActive: status EXPIRED when appropriate.

5. **lib/pricing.ts + lib/destination-charge.ts**  
   - calculateListingQuote output used in create-payment-intent and BuyNowModal.  
   - calculateDestinationChargeAmounts: application_fee_amount = platformFeeCents only.

6. **components/listings/BuyNowModal.tsx**  
   - idempotencyKey shape: `pi-${listing.id}-${quantity}-${deliveryFeeExGst}` (line 235).  
   - Same deliveryFeeExGst and quantity as sent to API.

7. **components/wanted/PayAcceptedOfferClient.tsx**  
   - No idempotencyKey in body (line 101–105).  
   - totalCharged display: 10% GST (lines 85–89).

8. **prisma/schema.prisma**  
   - PaymentAttempt (idempotencyKey unique, reservationStatus, status).  
   - Order (totalChargedCents, chargeModel, inventoryApplied, stripePaymentId unique).

---

*End of audit. No code changes made.*
