# GalaxRX — Financial Flow & Payments Code Pack

Single reference of all code related to financial flow and payments.  
**Purpose:** Manual review and audit. No modifications.

---

## 1. lib/platform-fee.ts (full)

```typescript
export const PLATFORM_FEE_PERCENT = 0.035; // 3.5%
export const MIN_PLATFORM_FEE = 1.5; // minimum $1.50 per sale

/** Platform fee: 3.5% of gross sale amount, minimum $1.50 */
export function calculatePlatformFee(grossAmount: number): number {
  const percentFee = grossAmount * PLATFORM_FEE_PERCENT;
  return Math.max(percentFee, MIN_PLATFORM_FEE);
}
```

---

## 2. lib/tax.ts (full)

```typescript
export type TaxClassification = "TAXABLE" | "GST_FREE" | "REVIEW_REQUIRED";
export const GST_RATE = 0.1;

export interface TaxResult {
  classification: TaxClassification;
  rate: number;
  rateLabel: string;
  reviewRequired: boolean;
}

export function getTaxClassification(params: {
  productCategory?: string | null;
  isGstFreeOverride?: boolean | null;
}): TaxResult {
  if (params.isGstFreeOverride === true) {
    return { classification: "GST_FREE", rate: 0, rateLabel: "GST-Free", reviewRequired: false };
  }
  if (params.isGstFreeOverride === false) {
    return { classification: "TAXABLE", rate: GST_RATE, rateLabel: "GST (10%)", reviewRequired: false };
  }
  return {
    classification: "REVIEW_REQUIRED",
    rate: GST_RATE,
    rateLabel: "GST (10%) — classification pending",
    reviewRequired: true,
  };
}

export function calculateGst(subtotalExGst: number, taxResult: TaxResult): number {
  return subtotalExGst * taxResult.rate;
}
```

---

## 3. lib/pricing.ts (full)

```typescript
import { calculatePlatformFee } from "./platform-fee";
import { GST_RATE } from "./tax";
import { getTaxClassification, calculateGst } from "./tax";
import type { TaxClassification } from "./tax";

export type QuoteInput = {
  unitPriceExGst: number;
  quantity: number;
  deliveryFeeExGst?: number;
};

export type Quote = {
  grossAmount: number;
  deliveryFeeExGst: number;
  subtotalExGst: number;
  gstAmount: number;
  totalCharged: number;
  platformFee: number;
  netToSeller: number;
  grossAmountCents: number;
  deliveryFeeExGstCents: number;
  gstAmountCents: number;
  totalChargedCents: number;
  platformFeeCents: number;
  netToSellerCents: number;
};

export type ListingQuoteInput = {
  unitPriceExGst: number;
  quantity: number;
  deliveryFeeExGst?: number;
  isGstFree?: boolean | null;
};

export type ListingQuote = Quote & {
  taxClassification: TaxClassification;
  rateLabel: string;
};

export function calculateListingQuote(input: ListingQuoteInput): ListingQuote {
  const { unitPriceExGst, quantity, deliveryFeeExGst = 0, isGstFree = null } = input;
  const grossAmount = unitPriceExGst * quantity;
  const platformFee = calculatePlatformFee(grossAmount);
  const subtotalExGst = grossAmount + deliveryFeeExGst;
  const taxResult = getTaxClassification({ isGstFreeOverride: isGstFree ?? undefined });
  const gstAmount = calculateGst(subtotalExGst, taxResult);
  const totalCharged = subtotalExGst + gstAmount;
  const netToSeller = grossAmount - platformFee + deliveryFeeExGst;

  return {
    grossAmount,
    deliveryFeeExGst,
    subtotalExGst,
    gstAmount,
    totalCharged,
    platformFee,
    netToSeller,
    grossAmountCents: Math.round(grossAmount * 100),
    deliveryFeeExGstCents: Math.round(deliveryFeeExGst * 100),
    gstAmountCents: Math.round(gstAmount * 100),
    totalChargedCents: Math.round(totalCharged * 100),
    platformFeeCents: Math.round(platformFee * 100),
    netToSellerCents: Math.round(netToSeller * 100),
    taxClassification: taxResult.classification,
    rateLabel: taxResult.rateLabel,
  };
}

export function calculateQuote(input: QuoteInput): Quote {
  const { unitPriceExGst, quantity, deliveryFeeExGst = 0 } = input;
  const grossAmount = unitPriceExGst * quantity;
  const platformFee = calculatePlatformFee(grossAmount);
  const subtotalExGst = grossAmount + deliveryFeeExGst;
  const gstAmount = subtotalExGst * GST_RATE;
  const totalCharged = subtotalExGst + gstAmount;
  const netToSeller = grossAmount - platformFee + deliveryFeeExGst;
  return {
    grossAmount,
    deliveryFeeExGst,
    subtotalExGst,
    gstAmount,
    totalCharged,
    platformFee,
    netToSeller,
    grossAmountCents: Math.round(grossAmount * 100),
    deliveryFeeExGstCents: Math.round(deliveryFeeExGst * 100),
    gstAmountCents: Math.round(gstAmount * 100),
    totalChargedCents: Math.round(totalCharged * 100),
    platformFeeCents: Math.round(platformFee * 100),
    netToSellerCents: Math.round(netToSeller * 100),
  };
}
```

---

## 4. lib/destination-charge.ts (full)

```typescript
export type DestinationChargeInput = {
  totalChargedCents: number;
  platformFeeCents: number;
  gstAmountCents: number;
  netToSellerCents: number;
};

export type DestinationChargeAmounts = {
  buyerTotalCents: number;
  platformFeeCents: number;
  gstAmountCents: number;
  applicationFeeAmountCents: number;
  netToSellerCents: number;
  transferToSellerCents: number;
  chargeModel: "destination";
};

export function calculateDestinationChargeAmounts(
  input: DestinationChargeInput
): DestinationChargeAmounts {
  const { totalChargedCents, platformFeeCents, gstAmountCents, netToSellerCents } = input;
  const applicationFeeAmountCents = platformFeeCents;
  const transferToSellerCents = totalChargedCents - applicationFeeAmountCents;
  return {
    buyerTotalCents: totalChargedCents,
    platformFeeCents,
    gstAmountCents,
    applicationFeeAmountCents,
    netToSellerCents,
    transferToSellerCents,
    chargeModel: "destination",
  };
}
```

---

## 5. lib/stripe-charge-model.ts (full)

```typescript
export type ChargeModel = "destination" | "direct";

export class DirectChargeNotSupportedError extends Error {
  constructor() {
    super(
      "Direct charge mode is not supported. Set STRIPE_USE_DIRECT_CHARGES to false or unset it. " +
        "Only destination charges are supported until PI creation, webhooks, and refunds use connected-account context."
    );
    this.name = "DirectChargeNotSupportedError";
  }
}

export function getChargeModel(): ChargeModel {
  if (process.env.STRIPE_USE_DIRECT_CHARGES === "true") {
    throw new DirectChargeNotSupportedError();
  }
  return "destination";
}
```

---

## 6. lib/stripe.ts (financial exports only)

```typescript
import {
  PLATFORM_FEE_PERCENT,
  MIN_PLATFORM_FEE,
  calculatePlatformFee as calcPlatformFee,
} from "./platform-fee";

// Stripe client init omitted; export:
export function calculatePlatformFee(grossAmount: number): number {
  return calcPlatformFee(grossAmount);
}
export { GST_RATE } from "./tax";
export { PLATFORM_FEE_PERCENT, MIN_PLATFORM_FEE } from "./platform-fee";
```

---

## 7. lib/listing-reservation.ts (full)

```typescript
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const RESERVATION_STATUS = {
  ACTIVE: "ACTIVE",
  CONSUMED: "CONSUMED",
  RELEASED: "RELEASED",
  EXPIRED: "EXPIRED",
} as const;

export type ReleaseResult =
  | { released: true; listingId: string; quantity: number }
  | { released: false; reason: "not_found" | "not_listing" | "already_released" };

export async function releaseListingReservationIfActive(
  tx: Prisma.TransactionClient,
  params: { paymentAttemptId?: string; stripePaymentIntentId?: string }
): Promise<ReleaseResult> {
  const { paymentAttemptId, stripePaymentIntentId } = params;
  if (!paymentAttemptId && !stripePaymentIntentId) {
    return { released: false, reason: "not_found" };
  }
  const attempt = await tx.paymentAttempt.findFirst({
    where: paymentAttemptId
      ? { id: paymentAttemptId }
      : { stripePaymentIntentId: stripePaymentIntentId! },
    select: {
      id: true,
      listingId: true,
      quantity: true,
      reservationStatus: true,
      expiresAt: true,
    },
  });
  if (!attempt) return { released: false, reason: "not_found" };
  if (!attempt.listingId) return { released: false, reason: "not_listing" };
  if (attempt.reservationStatus !== RESERVATION_STATUS.ACTIVE) {
    return { released: false, reason: "already_released" };
  }
  const listing = await tx.listing.findUnique({
    where: { id: attempt.listingId },
    select: { id: true, reservedQty: true },
  });
  if (!listing) {
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { reservationStatus: RESERVATION_STATUS.RELEASED },
    });
    return { released: true, listingId: attempt.listingId, quantity: attempt.quantity };
  }
  const newReserved = Math.max(0, listing.reservedQty - attempt.quantity);
  const finalStatus =
    attempt.expiresAt < new Date() ? RESERVATION_STATUS.EXPIRED : RESERVATION_STATUS.RELEASED;
  await tx.listing.update({
    where: { id: attempt.listingId },
    data: { reservedQty: newReserved },
  });
  await tx.paymentAttempt.update({
    where: { id: attempt.id },
    data: { reservationStatus: finalStatus },
  });
  return { released: true, listingId: attempt.listingId, quantity: attempt.quantity };
}

export async function expireListingReservationIfActive(
  tx: Prisma.TransactionClient,
  params: { paymentAttemptId?: string; stripePaymentIntentId?: string }
): Promise<ReleaseResult> {
  const result = await releaseListingReservationIfActive(tx, params);
  if (!result.released) return result;
  const { paymentAttemptId, stripePaymentIntentId } = params;
  const attempt = await tx.paymentAttempt.findFirst({
    where: paymentAttemptId
      ? { id: paymentAttemptId }
      : { stripePaymentIntentId: stripePaymentIntentId! },
    select: { id: true, status: true, expiresAt: true },
  });
  if (!attempt) return result;
  const now = new Date();
  if (attempt.expiresAt >= now) return result;
  if (!["PAID", "FAILED", "CANCELED", "EXPIRED"].includes(attempt.status)) {
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" },
    });
  }
  return result;
}

export async function findStaleListingReservations(): Promise<
  { id: string; listingId: string; quantity: number; expiresAt: Date; status: string }[]
> {
  const now = new Date();
  const attempts = await prisma.paymentAttempt.findMany({
    where: {
      listingId: { not: null },
      reservationStatus: RESERVATION_STATUS.ACTIVE,
      status: { not: "PAID" },
      OR: [{ expiresAt: { lt: now } }, { status: { in: ["FAILED", "EXPIRED", "CANCELED"] } }],
    },
    select: {
      id: true,
      listingId: true,
      quantity: true,
      expiresAt: true,
      status: true,
    },
  });
  return attempts as { id: string; listingId: string; quantity: number; expiresAt: Date; status: string }[];
}

export async function repairStaleListingReservations(): Promise<{
  processed: number;
  released: number;
  errors: { attemptId: string; error: string }[];
}> {
  const stale = await findStaleListingReservations();
  const errors: { attemptId: string; error: string }[] = [];
  let released = 0;
  for (const s of stale) {
    try {
      const result = await prisma.$transaction(async (tx) =>
        expireListingReservationIfActive(tx, { paymentAttemptId: s.id })
      );
      if (result.released) released++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ attemptId: s.id, error: msg });
    }
  }
  return { processed: stale.length, released, errors };
}
```

---

## 8. app/api/stripe/create-payment-intent/route.ts (key excerpts)

**Idempotency and existing-attempt resolution (listing):**
- Lookup by `idempotencyKey`; `resolveExistingListingAttempt`: if ACTIVE + PI + !expired → return clientSecret; if ACTIVE + expired → tx `expireListingReservationIfActive` then 400; if ACTIVE + !PI → 409; else 400.

**Listing path (create + reserve):**
- `getChargeModel()`; `calculateListingQuote(...)`; `calculateDestinationChargeAmounts(...)`.
- Tx: `listing findUnique` → available = quantityPacks - reservedQty; if available < quantity throw INSUFFICIENT_QUANTITY; `paymentAttempt.create` (idempotencyKey, listingId, quantity, reservationStatus ACTIVE, amounts, chargeModel, expiresAt); `listing.update` reservedQty increment.
- Then Stripe `paymentIntents.create` (amount, application_fee_amount, transfer_data.destination, metadata); `paymentAttempt.update` stripePaymentIntentId, status PAYMENT_INTENT_CREATED.
- On Stripe error: `prisma.$transaction(releaseListingReservationIfActive(tx, { paymentAttemptId: createdAttemptId }))`.
- P2002: re-fetch by idempotencyKey, `resolveExistingListingAttempt`, return if non-null.

**Wanted-offer path:**
- Load WantedOffer (status ACCEPTED), buyer = wantedItem.pharmacyId, seller.stripeAccountId.
- grossAmount = pricePerPack * quantity; deliveryFeeExGST; getTaxClassification({ isGstFreeOverride: null }); calculateGst; totalCharged; platformFee; netToSeller; calculateDestinationChargeAmounts.
- Lookup by idempotencyKey → `resolveExistingWantedOfferAttempt`.
- Create PaymentAttempt (wantedOfferId, no listingId, reservationStatus N/A, amounts, chargeModel, status QUOTED).
- Stripe paymentIntents.create; update attempt stripePaymentIntentId, status PAYMENT_INTENT_CREATED.
- P2002: re-fetch, resolveExistingWantedOfferAttempt.

---

## 9. app/api/stripe/webhook/route.ts (key excerpts)

**persistStripeEvent:** findUnique by eventId; if exists return; else create (eventId, type, payloadJson, processingStatus PENDING). Return id + processingStatus.

**processSuccessfulListingPayment (single tx):**
- existingOrder = findUnique by stripePaymentId.
- If existingOrder && inventoryApplied: update StripeEvent PROCESSED; update PaymentAttempt PAID/CONSUMED; return alreadyProcessed.
- If existingOrder && !inventoryApplied: repair listing (quantityPacks, reservedQty), pharmacy tradeCount, order inventoryApplied, StripeEvent PROCESSED, attempt PAID/CONSUMED; return.
- Else: create Order (listingId, amounts, stripePaymentId, totalChargedCents, chargeModel, inventoryApplied false); update listing quantityPacks, reservedQty, isActive; pharmacy tradeCount; order inventoryApplied true; StripeEvent PROCESSED; PaymentAttempt PAID/CONSUMED; return.

**processSuccessfulWantedOfferPayment (single tx):**
- existingOrder = findUnique by stripePaymentId.
- If existingOrder && inventoryApplied: StripeEvent PROCESSED; return alreadyProcessed.
- If existingOrder && !inventoryApplied: pharmacy tradeCount, order inventoryApplied, StripeEvent PROCESSED; return.
- Else: create Order (wantedOfferId, amounts, stripePaymentId, totalChargedCents, chargeModel, inventoryApplied false); pharmacy tradeCount; order inventoryApplied true; StripeEvent PROCESSED; return. (No PaymentAttempt update in this path.)

**payment_intent.succeeded:**
- Get chargeModel from metadata (fallback "destination"); findMany PaymentAttempt by stripePaymentIntentId; if length !== 1 failEvent; if listingId → parsedFromListingAttempt, processSuccessfulListingPayment; post-commit sendNewSale, sendPurchaseConfirmed, generateInvoicePDF. If wantedOfferId → buildParsedPaymentFromAttempt, processSuccessfulWantedOfferPayment; same post-commit.

**payment_intent.payment_failed / payment_intent.canceled:**
- tx: releaseListingReservationIfActive by stripePaymentIntentId; findFirst attempt by piId; update attempt status FAILED or CANCELED. Then StripeEvent PROCESSED.

---

## 10. app/api/orders/[id]/refund/route.ts (full financial logic)

```typescript
// Auth: admin only. Load order. Require order.stripePaymentId.
// totalChargedCents = order.totalChargedCents ?? Math.round((order.grossAmount + (order.deliveryFee ?? 0) + order.gstAmount) * 100);
// refundAmountCents = body.amountCents ?? totalChargedCents;
// Validate: refundAmountCents > 0 && refundAmountCents <= totalChargedCents
// chargeModel = order.chargeModel ?? "destination"
// If chargeModel === "direct" → 503 (not supported)
// stripe.refunds.create({ payment_intent: order.stripePaymentId, amount: refundAmountCents, reason: "requested_by_customer", refund_application_fee: true, reverse_transfer: true, metadata: { orderId, chargeModel } })
// prisma.refund.create({ orderId, stripeRefundId, amountCents: refundAmountCents, reason, initiatorId })
// newStatus = refundAmountCents >= totalChargedCents ? "REFUNDED_FULL" : "REFUNDED_PARTIAL"
// prisma.order.update({ where: id, data: { status: newStatus } })
// If order.source === "STRIPE" && order.listingId && newStatus === "REFUNDED_FULL": prisma.listing.update({ quantityPacks: increment order.quantity, isActive: true })
```

---

## 11. Prisma schema (payment-related models only)

**PaymentAttempt:** id, idempotencyKey (unique), buyerId, sellerId, listingId?, wantedOfferId?, quantity, deliveryFeeExGstCents, grossAmountCents, platformFeeCents, gstAmountCents, totalChargedCents, netToSellerCents, chargeModel?, status (QUOTED | PAYMENT_INTENT_CREATED | PAID | EXPIRED | FAILED | CANCELED), reservationStatus (ACTIVE | CONSUMED | RELEASED | EXPIRED), stripePaymentIntentId?, expiresAt.

**Order:** id, listingId?, wantedOfferId?, buyerId, sellerId, quantity, unitPrice, grossAmount, deliveryFee, platformFee, gstAmount, netAmount, stripePaymentId? (unique), totalChargedCents?, chargeModel?, source (STRIPE | MANUAL), status, inventoryApplied, fulfillmentType, ...

**Refund:** id, orderId, stripeRefundId?, amountCents, reason?, initiatorId?.

**StripeEvent:** id, eventId (unique), type, payloadJson, processingStatus (PENDING | PROCESSED | FAILED), errorMessage?.

**Listing:** ..., quantityPacks, reservedQty, isActive, ...

---

## 12. Client calls to create-payment-intent

**Listing (BuyNowModal.tsx):**
```typescript
const idempotencyKey = `pi-${listing.id}-${quantity}-${deliveryFeeExGst}`;
const res = await fetch("/api/stripe/create-payment-intent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    listingId: listing.id,
    quantity,
    deliveryFee: deliveryFeeExGst,
    idempotencyKey,
  }),
});
```

**Wanted-offer (PayAcceptedOfferClient.tsx):**
```typescript
const res = await fetch("/api/stripe/create-payment-intent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    wantedOfferId: offer.id,
    deliveryFee: 0,
  }),
});
// No idempotencyKey sent; server generates one.
```

---

*This pack is for review only. For full file paths and line-level checklist see FINAL_AUDIT_STRIPE_FINANCE_HARDENING.md.*
