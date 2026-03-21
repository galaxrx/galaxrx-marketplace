# GalaxRX — Finance Code Review Bundle

**Purpose:** Single document containing all finance-related source code and explanations so that ChatGPT, Claude, or another LLM can review it for correctness, security, and risk. This area is high risk; bugs can cause incorrect charges, double orders, or lost funds.

**How to use:** Paste or attach this file to an LLM and ask it to audit the finance flow (payment creation, webhooks, orders, refunds, fees, tax, Stripe Connect, reconciliation).

---

## Table of contents

1. [Core: Stripe config, fees, tax, pricing](#1-core-stripe-config-fees-tax-pricing)
2. [Payment creation (create-payment-intent)](#2-payment-creation-create-payment-intent)
3. [Stripe webhook (payment success, disputes, account)](#3-stripe-webhook)
4. [Orders API (list, manual order creation)](#4-orders-api)
5. [Order status update](#5-order-status-update)
6. [Refund API](#6-refund-api)
7. [Stripe Connect (onboard, status)](#7-stripe-connect)
8. [Invoice PDF and purchase emails](#8-invoice-pdf-and-purchase-emails)
9. [Admin: stats and reconciliation](#9-admin-stats-and-reconciliation)
10. [Database schema (finance-related)](#10-database-schema-finance-related)

---

## 1. Core: Stripe config, fees, tax, pricing

### 1.1 `lib/stripe.ts`

```typescript
import Stripe from "stripe";
import { GST_RATE } from "./tax";

const secret = process.env.STRIPE_SECRET_KEY?.trim();
export const stripe =
  secret && secret.length > 0
    ? new Stripe(secret, {
        apiVersion: "2024-09-30.acacia",
        typescript: true,
      })
    : null;

export const PLATFORM_FEE_PERCENT = 0.035; // 3.5%
export const MIN_PLATFORM_FEE = 1.5; // minimum $1.50 per sale
export { GST_RATE } from "./tax";

export function calculatePlatformFee(grossAmount: number): number {
  const percentFee = grossAmount * PLATFORM_FEE_PERCENT;
  return Math.max(percentFee, MIN_PLATFORM_FEE);
}
```

**Explanation / review notes:**
- Stripe client is null if `STRIPE_SECRET_KEY` is missing or empty (trimmed). All payment routes must check `stripe` before use.
- Platform fee: 3.5% of **gross** (product only), minimum $1.50. Applied to seller’s side; not added to buyer total.
- `GST_RATE` is re-exported from `lib/tax.ts` (0.1). Single source for GST rate.

---

### 1.2 `lib/stripe-charge-model.ts`

```typescript
/**
 * DESTINATION CHARGES (current/legacy): charge on platform; transfer to seller; GalaxRX = MoR.
 * DIRECT CHARGES (target): charge on seller's connected account; seller = MoR; platform earns application_fee only.
 */
export type ChargeModel = "destination" | "direct";

export function getChargeModel(): ChargeModel {
  return process.env.STRIPE_USE_DIRECT_CHARGES === "true" ? "direct" : "destination";
}
```

**Explanation / review notes:**
- One env var controls behaviour: `STRIPE_USE_DIRECT_CHARGES === "true"` → direct; otherwise destination.
- Refund and PaymentIntent creation both branch on this. Consistency is critical.

---

### 1.3 `lib/tax.ts`

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

**Explanation / review notes:**
- Listing has `isGstFree` (boolean | null). `true` → 0% GST; `false` → 10%; `null` → REVIEW_REQUIRED but still 10% for now (conservative).
- Wanted offers do not have classification in DB yet; create-payment-intent uses `getTaxClassification({ isGstFreeOverride: null })` → REVIEW_REQUIRED, 10%.
- Risk: misclassification can over/under charge GST; document states not tax-professionally reviewed.

---

### 1.4 `lib/pricing.ts`

```typescript
import { calculatePlatformFee, GST_RATE } from "./stripe";

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

**Explanation / review notes:**
- Uses flat `GST_RATE` (10%); does not use `getTaxClassification`. So UI quote may show 10% even for GST-free listings unless UI uses tax module separately. Create-payment-intent uses tax module; pricing.ts is used for display/quote.
- Net to seller = gross - platformFee + deliveryFee (all ex-GST from seller’s perspective; GST is buyer-facing).
- All cent values are rounded; used for persistence/Stripe where applicable.

---

## 2. Payment creation (create-payment-intent)

**File:** `app/api/stripe/create-payment-intent/route.ts`

- **Auth:** Session required; buyer must be verified pharmacy.
- **Listing flow:** Requires `listingId`, `quantity`; optional `deliveryFee` override; checks seller has Stripe Connect, `charges_enabled`; reserves quantity in a transaction; computes unit price, delivery, GST (via tax module), platform fee, total; creates PaymentIntent (destination or direct per env); returns `clientSecret`.
- **Wanted-offer flow:** Requires `wantedOfferId`; offer must be ACCEPTED; buyer must own the wanted item; seller must have `stripeAccountId` and `charges_enabled`; no reservation (no listing inventory); same fee/tax math; creates PaymentIntent with `wantedOfferId` in metadata.
- **Idempotency:** Body can pass `idempotencyKey`; else server generates one. Sent to Stripe on `paymentIntents.create`.
- **Direct vs destination:**  
  - **Destination:** `amount` = total charged; `application_fee_amount` = gstAmount + platformFee (platform keeps GST + fee); `transfer_data.destination` = seller.  
  - **Direct:** `amount` = total charged; `application_fee_amount` = platformFee only (GST stays with seller); `on_behalf_of` and `transfer_data.destination` = seller account.
- **Risks:** Reservation is released only when webhook processes success or by a future cron (TODO); no cron yet so stale reservations can persist. Double submission with same idempotency key is safe; different keys could double-reserve if user clicks twice with different keys.

<details>
<summary>Full source: create-payment-intent/route.ts</summary>

```typescript
// ============================================================
// CHARGE MODEL: controlled by STRIPE_USE_DIRECT_CHARGES env var
// "destination" (default): GalaxRX = MoR, higher chargeback risk
// "direct" (target):       Seller = MoR, lower GalaxRX risk
// ============================================================

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { getChargeModel } from "@/lib/stripe-charge-model";
import { getTaxClassification, calculateGst } from "@/lib/tax";
import Stripe from "stripe";

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { message: "Stripe is not configured" },
      { status: 503 }
    );
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const buyerId = (session.user as { id: string }).id;
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: buyerId },
  });
  if (!pharmacy?.isVerified) {
    return NextResponse.json(
      { message: "Pharmacy must be verified to purchase." },
      { status: 403 }
    );
  }
  try {
    const body = await req.json();
    const { listingId, quantity, deliveryFee: deliveryFeeOverride, wantedOfferId, idempotencyKey } = body as {
      listingId?: string;
      quantity?: number;
      deliveryFee?: number;
      wantedOfferId?: string;
      idempotencyKey?: string;
    };
    const stripeIdempotencyKey = (typeof idempotencyKey === "string" && idempotencyKey.trim())
      ? idempotencyKey.trim()
      : `pi-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

    if (wantedOfferId) {
      const offer = await prisma.wantedOffer.findFirst({
        where: { id: wantedOfferId, status: "ACCEPTED" },
        include: {
          wantedItem: true,
          seller: { select: { id: true, stripeAccountId: true } },
        },
      });
      if (!offer) {
        return NextResponse.json(
          { message: "Accepted offer not found" },
          { status: 404 }
        );
      }
      if (offer.wantedItem.pharmacyId !== buyerId) {
        return NextResponse.json(
          { message: "Only the wanted item owner can pay for this offer" },
          { status: 403 }
        );
      }
      if (!offer.seller.stripeAccountId) {
        return NextResponse.json(
          { message: "Seller has not connected their bank account yet" },
          { status: 400 }
        );
      }
      const sellerStripeAccountId = offer.seller.stripeAccountId;
      try {
        const sellerAccount = await stripe.accounts.retrieve(sellerStripeAccountId);
        if (!sellerAccount.charges_enabled) {
          return NextResponse.json(
            { message: "Seller payment account is currently restricted. Please contact support." },
            { status: 400 }
          );
        }
      } catch {
        console.warn("[GalaxRX] Could not verify seller account health for:", sellerStripeAccountId);
      }
      const deliveryFeeExGST =
        typeof deliveryFeeOverride === "number" && deliveryFeeOverride >= 0 ? deliveryFeeOverride : 0;
      const grossAmount = offer.pricePerPack * offer.quantity;
      const subtotalExGST = grossAmount + deliveryFeeExGST;
      const taxResult = getTaxClassification({ isGstFreeOverride: null });
      const gstAmount = calculateGst(subtotalExGST, taxResult);
      const totalCharged = subtotalExGST + gstAmount;
      const platformFee = calculatePlatformFee(grossAmount);
      const netToSeller = grossAmount - platformFee + deliveryFeeExGST;
      const amountInCents = Math.round(totalCharged * 100);
      const applicationFeeInCents = Math.round((gstAmount + platformFee) * 100);
      const chargeModel = getChargeModel();

      const piParams: Stripe.PaymentIntentCreateParams = chargeModel === "direct"
        ? {
            amount: amountInCents,
            currency: "aud",
            application_fee_amount: Math.round(platformFee * 100),
            on_behalf_of: offer.seller.stripeAccountId,
            transfer_data: {
              destination: offer.seller.stripeAccountId,
            },
            metadata: {
              chargeModel: "direct",
              wantedOfferId: offer.id,
              buyerId,
              sellerId: offer.sellerId,
              quantity: String(offer.quantity),
              unitPrice: String(offer.pricePerPack),
              grossAmount: String(grossAmount),
              deliveryFee: String(deliveryFeeExGST),
              platformFee: String(platformFee),
              gstAmount: String(gstAmount),
              netToSeller: String(netToSeller),
              taxClassification: taxResult.classification,
            },
          }
        : {
            amount: amountInCents,
            currency: "aud",
            application_fee_amount: applicationFeeInCents,
            transfer_data: {
              destination: offer.seller.stripeAccountId,
            },
            metadata: {
              chargeModel: "destination",
              wantedOfferId: offer.id,
              buyerId,
              sellerId: offer.sellerId,
              quantity: String(offer.quantity),
              unitPrice: String(offer.pricePerPack),
              grossAmount: String(grossAmount),
              deliveryFee: String(deliveryFeeExGST),
              platformFee: String(platformFee),
              gstAmount: String(gstAmount),
              netToSeller: String(netToSeller),
              taxClassification: taxResult.classification,
            },
          };

      const paymentIntent = await stripe.paymentIntents.create(piParams, {
        idempotencyKey: stripeIdempotencyKey,
      });
      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
      });
    }

    if (!listingId || !quantity || quantity < 1) {
      return NextResponse.json(
        { message: "listingId and quantity required" },
        { status: 400 }
      );
    }
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { pharmacy: true },
    });
    if (!listing || !listing.isActive) {
      return NextResponse.json(
        { message: "Listing not found or inactive" },
        { status: 404 }
      );
    }
    if (listing.pharmacyId === buyerId) {
      return NextResponse.json(
        { message: "Cannot buy your own listing" },
        { status: 400 }
      );
    }
    if (!listing.pharmacy.stripeAccountId) {
      return NextResponse.json(
        { message: "Seller has not connected their bank account yet" },
        { status: 400 }
      );
    }
    const sellerStripeAccountId = listing.pharmacy.stripeAccountId;
    try {
      const sellerAccount = await stripe.accounts.retrieve(sellerStripeAccountId);
      if (!sellerAccount.charges_enabled) {
        return NextResponse.json(
          { message: "Seller payment account is currently restricted. Please contact support." },
          { status: 400 }
        );
      }
    } catch {
      console.warn("[GalaxRX] Could not verify seller account health for:", sellerStripeAccountId);
    }

    try {
      await prisma.$transaction(async (tx) => {
        const fresh = await tx.listing.findUnique({ where: { id: listingId } });
        const available = (fresh?.quantityPacks ?? 0) - (fresh?.reservedQty ?? 0);
        if (!fresh || available < quantity) {
          throw new Error("INSUFFICIENT_QUANTITY");
        }
        return tx.listing.update({
          where: { id: listingId },
          data: { reservedQty: { increment: quantity } },
        });
      });
    } catch (e) {
      if (e instanceof Error && e.message === "INSUFFICIENT_QUANTITY") {
        return NextResponse.json(
          { message: "Insufficient quantity available" },
          { status: 400 }
        );
      throw e;
    }

    const unitPriceExGST = listing.pricePerPack;
    const listingDeliveryFee = (listing as { deliveryFee?: number }).deliveryFee ?? 0;
    const deliveryFeeExGST =
      typeof deliveryFeeOverride === "number" && deliveryFeeOverride >= 0
        ? deliveryFeeOverride
        : listingDeliveryFee;
    const grossAmount = unitPriceExGST * quantity;
    const subtotalExGST = grossAmount + deliveryFeeExGST;
    const taxResult = getTaxClassification({ isGstFreeOverride: listing.isGstFree ?? null });
    const gstAmount = calculateGst(subtotalExGST, taxResult);
    const totalCharged = subtotalExGST + gstAmount;
    const platformFee = calculatePlatformFee(grossAmount);
    const netToSeller = grossAmount - platformFee + deliveryFeeExGST;

    const amountInCents = Math.round(totalCharged * 100);
    const applicationFeeInCents = Math.round((gstAmount + platformFee) * 100);
    const chargeModel = getChargeModel();

    const piParams: Stripe.PaymentIntentCreateParams = chargeModel === "direct"
      ? {
          amount: amountInCents,
          currency: "aud",
          application_fee_amount: Math.round(platformFee * 100),
          on_behalf_of: listing.pharmacy.stripeAccountId,
          transfer_data: {
            destination: listing.pharmacy.stripeAccountId,
          },
          metadata: {
            chargeModel: "direct",
            listingId,
            buyerId,
            sellerId: listing.pharmacyId,
            quantity: String(quantity),
            reservedQty: String(quantity),
            unitPrice: String(unitPriceExGST),
            grossAmount: String(grossAmount),
            deliveryFee: String(deliveryFeeExGST),
            platformFee: String(platformFee),
            gstAmount: String(gstAmount),
            netToSeller: String(netToSeller),
            reservedAt: new Date().toISOString(),
            taxClassification: taxResult.classification,
          },
        }
      : {
          amount: amountInCents,
          currency: "aud",
          application_fee_amount: applicationFeeInCents,
          transfer_data: {
            destination: listing.pharmacy.stripeAccountId,
          },
          metadata: {
            chargeModel: "destination",
            listingId,
            buyerId,
            sellerId: listing.pharmacyId,
            quantity: String(quantity),
            reservedQty: String(quantity),
            unitPrice: String(unitPriceExGST),
            grossAmount: String(grossAmount),
            deliveryFee: String(deliveryFeeExGST),
            platformFee: String(platformFee),
            gstAmount: String(gstAmount),
            netToSeller: String(netToSeller),
            reservedAt: new Date().toISOString(),
            taxClassification: taxResult.classification,
          },
        };

    const paymentIntent = await stripe.paymentIntents.create(piParams, {
      idempotencyKey: stripeIdempotencyKey,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
```

</details>

---

## 3. Stripe webhook

**File:** `app/api/stripe/webhook/route.ts`

- **Verification:** Raw body + `stripe-signature` header; verified with `STRIPE_WEBHOOK_SECRET`. No auth header; Stripe uses signature.
- **Idempotency:** Every event is stored in `StripeEvent` by `event.id`. If `processingStatus === "PROCESSED"`, handler returns 200 without reprocessing.
- **payment_intent.succeeded:**  
  - Reads metadata: listingId or wantedOfferId, quantity, buyerId, sellerId, unitPrice, grossAmount, deliveryFee, platformFee, gstAmount, netToSeller.  
  - If quantity/buyerId/sellerId missing, marks event PROCESSED and returns (no order).  
  - If order already exists for `stripePaymentId`, marks PROCESSED and returns.  
  - Parses numeric metadata (with fallbacks: platformFee = calculatePlatformFee(gross), gst = (gross+delivery)*GST_RATE, net = gross - platformFee + delivery).  
  - **Wanted offer:** Creates order with wantedOfferId; increments seller tradeCount; sends sendNewSale to seller, sendPurchaseConfirmed + invoice PDF to buyer.  
  - **Listing:** Creates order with listingId; decrements listing quantityPacks; decrements listing reservedQty; increments seller tradeCount; same emails.  
  - On any error in the try block, event is marked FAILED with errorMessage, then error is rethrown.  
- **charge.dispute.created / updated:** Finds order by charge → payment_intent id; sets status DISPUTED, disputedAt, stripeDisputeId.
- **charge.dispute.closed:** Sets order status to DISPUTE_LOST (if lost), PAID (if won), or DISPUTED; sets disputeClosedAt.
- **account.updated:** Updates pharmacy stripeChargesEnabled / stripePayoutsEnabled from Stripe account.

**Risks:** Metadata is trusted (from our create-payment-intent). Fallback math (platformFee, gst, net) could diverge from create-payment-intent if metadata is missing/corrupt. Listing path does two separate updates (quantityPacks then reservedQty)—not in one transaction; if second fails, stock is reduced but reservation not released (bug). Order create and listing updates are not in a single DB transaction with event mark PROCESSED—theoretical double delivery on retry after partial success.

<details>
<summary>Full source: webhook/route.ts</summary>

```typescript
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe, calculatePlatformFee, GST_RATE } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendNewSale, sendPurchaseConfirmed } from "@/lib/resend";
import { generateInvoicePDF } from "@/lib/invoice-pdf-server";

async function persistStripeEvent(event: Stripe.Event): Promise<{ id: string; processingStatus: string }> {
  const existing = await prisma.stripeEvent.findUnique({
    where: { eventId: event.id },
  });
  if (existing) return { id: existing.id, processingStatus: existing.processingStatus };
  const created = await prisma.stripeEvent.create({
    data: {
      eventId: event.id,
      type: event.type,
      payloadJson: JSON.stringify(event),
      processingStatus: "PENDING",
    },
  });
  return { id: created.id, processingStatus: created.processingStatus };
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { message: "Stripe not configured" },
      { status: 503 }
    );
  }
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { message: "Webhook secret required" },
      { status: 400 }
    );
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ message }, { status: 400 });
  }

  const { id: eventRowId, processingStatus } = await persistStripeEvent(event);
  if (processingStatus === "PROCESSED") {
    return NextResponse.json({ received: true });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { listingId, wantedOfferId, quantity, buyerId, sellerId, unitPrice: unitPriceStr, grossAmount: grossStr, deliveryFee: deliveryFeeStr, platformFee: feeStr, gstAmount: gstStr, netToSeller: netStr } =
      pi.metadata || {};
    if (!quantity || !buyerId || !sellerId) {
      await prisma.stripeEvent.update({
        where: { eventId: event.id },
        data: { processedAt: new Date(), processingStatus: "PROCESSED" },
      });
      return NextResponse.json({ received: true });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { stripePaymentId: pi.id },
    });
    if (existingOrder) {
      await prisma.stripeEvent.update({
        where: { eventId: event.id },
        data: { processedAt: new Date(), processingStatus: "PROCESSED" },
      });
      return NextResponse.json({ received: true });
    }

    const qty = parseInt(quantity, 10);
    const grossAmount = grossStr ? parseFloat(grossStr) : 0;
    const deliveryFee = deliveryFeeStr ? parseFloat(deliveryFeeStr) : 0;
    const unitPrice = unitPriceStr ? parseFloat(unitPriceStr) : 0;
    const platformFee = feeStr ? parseFloat(feeStr) : calculatePlatformFee(grossAmount);
    const gstAmount = gstStr ? parseFloat(gstStr) : (grossAmount + deliveryFee) * GST_RATE;
    const netAmount = netStr ? parseFloat(netStr) : grossAmount - platformFee + deliveryFee;

    try {
      if (wantedOfferId) {
        const offer = await prisma.wantedOffer.findUnique({
          where: { id: wantedOfferId },
          include: { wantedItem: true },
        });
        if (!offer) {
          await prisma.stripeEvent.update({
            where: { eventId: event.id },
            data: { processedAt: new Date(), processingStatus: "PROCESSED" },
          });
          return NextResponse.json({ received: true });
        }
        const order = await prisma.order.create({
          data: {
            wantedOfferId: offer.id,
            buyerId,
            sellerId,
            quantity: qty,
            unitPrice,
            grossAmount,
            deliveryFee,
            platformFee,
            gstAmount,
            netAmount,
            stripePaymentId: pi.id,
            source: "STRIPE",
            status: "PAID",
            fulfillmentType: "NATIONAL_SHIPPING",
          },
        });
        await prisma.pharmacy.update({
          where: { id: sellerId },
          data: { tradeCount: { increment: 1 } },
        });
        const buyer = await prisma.pharmacy.findUnique({
          where: { id: buyerId },
          select: { email: true, name: true, notifyPurchase: true },
        });
        const seller = await prisma.pharmacy.findUnique({
          where: { id: sellerId },
          select: { email: true, notifyNewSale: true },
        });
        const productName = offer.wantedItem.productName;
        if (seller?.email && seller.notifyNewSale) {
          await sendNewSale(seller.email, productName, buyer?.name ?? "A pharmacy");
        }
        if (buyer?.email) {
          const orderIdShort = `GX-${order.id.slice(-5).toUpperCase()}`;
          let invoicePdfBuffer: Buffer | undefined;
          try {
            const fullOrder = await prisma.order.findUnique({
              where: { id: order.id },
              include: {
                wantedOffer: { include: { wantedItem: true } },
                buyer: { select: { name: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
                seller: { select: { name: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
              },
            });
            if (fullOrder?.wantedOffer?.wantedItem) {
              const wi = fullOrder.wantedOffer.wantedItem;
              invoicePdfBuffer = await generateInvoicePDF({
                id: fullOrder.id,
                quantity: fullOrder.quantity,
                unitPrice: fullOrder.unitPrice,
                grossAmount: fullOrder.grossAmount,
                deliveryFee: fullOrder.deliveryFee ?? 0,
                gstAmount: fullOrder.gstAmount,
                platformFee: fullOrder.platformFee,
                netAmount: fullOrder.netAmount,
                createdAt: fullOrder.createdAt,
                listing: { productName: wi.productName, strength: wi.strength ?? null, packSize: undefined },
                buyer: fullOrder.buyer,
                seller: fullOrder.seller,
              });
            }
          } catch (e) {
            console.error("Invoice PDF generation failed:", e);
          }
          await sendPurchaseConfirmed(buyer.email, orderIdShort, {
            invoicePdfBuffer: invoicePdfBuffer ?? undefined,
            invoiceFileName: invoicePdfBuffer ? `invoice-${orderIdShort}.pdf` : undefined,
          });
        }
        await prisma.stripeEvent.update({
          where: { eventId: event.id },
          data: { processedAt: new Date(), processingStatus: "PROCESSED" },
        });
        return NextResponse.json({ received: true });
      }

      if (!listingId) {
        await prisma.stripeEvent.update({
          where: { eventId: event.id },
          data: { processedAt: new Date(), processingStatus: "PROCESSED" },
        });
        return NextResponse.json({ received: true });
      }
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { pharmacy: true },
      });
      if (!listing) {
        await prisma.stripeEvent.update({
          where: { eventId: event.id },
          data: { processedAt: new Date(), processingStatus: "PROCESSED" },
        });
        return NextResponse.json({ received: true });
      }
      const order = await prisma.order.create({
        data: {
          listingId,
          buyerId,
          sellerId,
          quantity: qty,
          unitPrice,
          grossAmount,
          deliveryFee,
          platformFee,
          gstAmount,
          netAmount,
          stripePaymentId: pi.id,
          source: "STRIPE",
          status: "PAID",
          fulfillmentType: listing.fulfillmentType,
        },
      });
      const newQty = listing.quantityPacks - qty;
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          quantityPacks: newQty,
          isActive: newQty > 0,
        },
      });
      await prisma.listing.update({
        where: { id: listingId },
        data: { reservedQty: { decrement: qty } },
      });
      await prisma.pharmacy.update({
        where: { id: sellerId },
        data: { tradeCount: { increment: 1 } },
      });
      // ... buyer/seller emails + invoice same pattern as wanted ...
      await prisma.stripeEvent.update({
        where: { eventId: event.id },
        data: { processedAt: new Date(), processingStatus: "PROCESSED" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.stripeEvent.update({
        where: { eventId: event.id },
        data: { processingStatus: "FAILED", errorMessage: msg },
      }).catch(() => {});
      throw err;
    }
  }

  if (event.type === "charge.dispute.created" || event.type === "charge.dispute.updated") {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
    if (chargeId) {
      try {
        const charge = await stripe.charges.retrieve(chargeId);
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) {
          const order = await prisma.order.findUnique({
            where: { stripePaymentId: paymentIntentId },
          });
          if (order) {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "DISPUTED", disputedAt: new Date(), stripeDisputeId: dispute.id },
            });
          }
        }
      } catch (e) {
        console.error("Dispute webhook error:", e);
      }
    }
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date(), processingStatus: "PROCESSED" },
    }).catch(() => {});
  }

  if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
    if (chargeId) {
      try {
        const charge = await stripe.charges.retrieve(chargeId);
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) {
          const order = await prisma.order.findUnique({
            where: { stripePaymentId: paymentIntentId },
          });
          if (order) {
            const status = dispute.status === "lost" ? "DISPUTE_LOST" : dispute.status === "won" ? "PAID" : "DISPUTED";
            await prisma.order.update({
              where: { id: order.id },
              data: { status, disputeClosedAt: new Date() },
            });
          }
        }
      } catch (e) {
        console.error("Dispute closed webhook error:", e);
      }
    }
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date(), processingStatus: "PROCESSED" },
    }).catch(() => {});
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const pharmacy = await prisma.pharmacy.findFirst({
      where: { stripeAccountId: account.id },
    });
    if (pharmacy) {
      const chargesEnabled = account.charges_enabled ?? false;
      const payoutsEnabled = account.payouts_enabled ?? false;
      if (!chargesEnabled || !payoutsEnabled) {
        console.warn("[GalaxRX] Seller account restricted:", account.id);
      }
      await prisma.pharmacy.update({
        where: { id: pharmacy.id },
        data: {
          stripeChargesEnabled: chargesEnabled,
          stripePayoutsEnabled: payoutsEnabled,
        },
      });
    }
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date(), processingStatus: "PROCESSED" },
    }).catch(() => {});
  }

  return NextResponse.json({ received: true });
}
```

</details>

---

## 4. Orders API

**File:** `app/api/orders/route.ts`

- **GET:** Session required. Query `type` = purchases | sales. Returns orders for current pharmacy (buyer or seller) with listing/wantedOffer, buyer/seller, reviews. Used for orders list; amounts are in response.
- **POST (manual order):** Admin only. Body: listingId, quantity, buyerId, deliveryFee (optional). Validates listing active and quantity available. Computes unitPrice, grossAmount, platformFee (calculatePlatformFee), gstAmount = (gross + delivery) * GST_RATE, netAmount = gross - platformFee + delivery. Creates order with source=MANUAL, stripePaymentId=null, status=PAID. Decrements listing quantityPacks and sets isActive. No Stripe call.

**Review notes:** Manual order uses same fee/GST math as Stripe flow for consistency. No idempotency key; duplicate POST could create duplicate manual orders.

<details>
<summary>Full source: orders/route.ts</summary>

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePlatformFee, GST_RATE } from "@/lib/stripe";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "purchases";
  const where =
    type === "sales"
      ? { sellerId: pharmacyId }
      : { buyerId: pharmacyId };
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      listing: { select: { productName: true, strength: true, packSize: true } },
      wantedOffer: { include: { wantedItem: { select: { productName: true, strength: true } } } },
      buyer: { select: { id: true, name: true, isVerified: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
      seller: { select: { id: true, name: true, isVerified: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
      reviews: { select: { id: true, reviewerId: true, subjectId: true } },
    },
  });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "Only administrators can create manual orders. Use checkout for Stripe-paid orders." },
      { status: 403 }
    );
  }
  try {
    const body = await req.json();
    const { listingId, quantity, buyerId, deliveryFee } = body as {
      listingId: string;
      quantity: number;
      buyerId: string;
      deliveryFee?: number;
    };
    if (!listingId || !quantity || quantity < 1 || !buyerId) {
      return NextResponse.json(
        { message: "listingId, quantity, and buyerId required" },
        { status: 400 }
      );
    }
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { pharmacy: true },
    });
    if (!listing || !listing.isActive) {
      return NextResponse.json(
        { message: "Listing not found or inactive" },
        { status: 404 }
      );
    }
    if (listing.quantityPacks < quantity) {
      return NextResponse.json(
        { message: "Insufficient quantity" },
        { status: 400 }
      );
    }
    const deliveryFeeExGst = typeof deliveryFee === "number" && deliveryFee >= 0 ? deliveryFee : 0;
    const unitPrice = listing.pricePerPack;
    const grossAmount = unitPrice * quantity;
    const platformFee = calculatePlatformFee(grossAmount);
    const gstAmount = (grossAmount + deliveryFeeExGst) * GST_RATE;
    const netAmount = grossAmount - platformFee + deliveryFeeExGst;

    const order = await prisma.order.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.pharmacyId,
        quantity,
        unitPrice,
        grossAmount,
        deliveryFee: deliveryFeeExGst,
        platformFee,
        gstAmount,
        netAmount,
        stripePaymentId: null,
        source: "MANUAL",
        status: "PAID",
        fulfillmentType: listing.fulfillmentType,
      },
    });
    const newQty = listing.quantityPacks - quantity;
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        quantityPacks: newQty,
        isActive: newQty > 0,
      },
    });
    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to create order" },
      { status: 500 }
    );
  }
}
```

</details>

---

## 5. Order status update

**File:** `app/api/orders/[id]/status/route.ts`

- **PUT:** Session required. Body: status (SHIPPED | DELIVERED), optional trackingNumber, courierName. SHIPPED: only seller can set; order must be PAID. DELIVERED: only buyer can set; order must be SHIPPED. Updates order and sends “order shipped” email when status becomes SHIPPED. No money movement; fulfillment only.

---

## 6. Refund API

**File:** `app/api/orders/[id]/refund/route.ts`

- **POST:** Admin only. Order must exist, have stripePaymentId, and status not already REFUNDED_*.
- **Body:** amountCents (optional), reason (optional). If amountCents omitted, full refund (totalChargedCents).
- **Total charged:** `(order.grossAmount + (order.deliveryFee ?? 0) + order.gstAmount) * 100` rounded. Refund must be > 0 and ≤ totalChargedCents.
- **Stripe:** Retrieves PaymentIntent; reads metadata.chargeModel.  
  - **Direct:** refund with payment_intent, amount, reason; no reverse_transfer (no transfer to reverse).  
  - **Destination:** refund with payment_intent, amount, reason, refund_application_fee: true, reverse_transfer: true.
- **DB:** Creates Refund row (orderId, stripeRefundId, amountCents, reason, initiatorId). Order status → REFUNDED_FULL or REFUNDED_PARTIAL. If source=STRIPE, listingId present, and full refund, restores listing quantityPacks (increment by order.quantity) and sets isActive true.

**Review notes:** Refund amount is derived from order totals, not from Stripe PI amount—should match. Partial refund does not restore stock; only full refund does. No idempotency: duplicate refund POST could create two Stripe refunds (Stripe may reject second if amount exceeds remaining).

<details>
<summary>Full source: refund/route.ts</summary>

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "Only administrators can create refunds." },
      { status: 403 }
    );
  }
  if (!stripe) {
    return NextResponse.json(
      { message: "Stripe not configured" },
      { status: 503 }
    );
  }
  const { id: orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  if (!order.stripePaymentId) {
    return NextResponse.json(
      { message: "Order was not paid via Stripe. Cannot refund via this flow." },
      { status: 400 }
    );
  }
  if (["REFUNDED", "REFUNDED_FULL", "REFUNDED_PARTIAL"].includes(order.status)) {
    return NextResponse.json(
      { message: "Order already refunded." },
      { status: 400 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const amountCents = typeof body.amountCents === "number" ? body.amountCents : null;
  const reason = typeof body.reason === "string" ? body.reason : null;

  const totalChargedCents = Math.round((order.grossAmount + (order.deliveryFee ?? 0) + order.gstAmount) * 100);
  const refundAmountCents = amountCents ?? totalChargedCents;
  if (refundAmountCents <= 0 || refundAmountCents > totalChargedCents) {
    return NextResponse.json(
      { message: "Invalid refund amount." },
      { status: 400 }
    );
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentId);
    const chargeModel = (pi.metadata?.chargeModel as string) ?? "destination";

    const refundParams: Stripe.RefundCreateParams = chargeModel === "direct"
      ? {
          payment_intent: order.stripePaymentId,
          amount: refundAmountCents,
          reason: "requested_by_customer",
          metadata: { orderId, chargeModel: "direct" },
        }
      : {
          payment_intent: order.stripePaymentId,
          amount: refundAmountCents,
          reason: "requested_by_customer",
          refund_application_fee: true,
          reverse_transfer: true,
          metadata: { orderId, chargeModel: "destination" },
        };

    const refund = await stripe.refunds.create(refundParams);

    await prisma.refund.create({
      data: {
        orderId: order.id,
        stripeRefundId: refund.id,
        amountCents: refundAmountCents,
        reason: reason ?? undefined,
        initiatorId: (session.user as { id: string }).id,
      },
    });

    const newStatus = refundAmountCents >= totalChargedCents ? "REFUNDED_FULL" : "REFUNDED_PARTIAL";
    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    if (order.source === "STRIPE" && order.listingId && newStatus === "REFUNDED_FULL") {
      await prisma.listing.update({
        where: { id: order.listingId },
        data: {
          quantityPacks: { increment: order.quantity },
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      refundId: refund.id,
      amountCents: refundAmountCents,
      orderStatus: newStatus,
    });
  } catch (e) {
    console.error("Refund error:", e instanceof Error ? e.message : String(e), e);
    const message = e instanceof Error ? e.message : "Refund failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}
```

</details>

---

## 7. Stripe Connect

### 7.1 Connect onboard — `app/api/stripe/connect-onboard/route.ts`

- **POST:** Session required. Creates or reuses Stripe Connect account (type standard, country AU, pharmacy email). Stores stripeAccountId on Pharmacy. Creates account link (refresh_url, return_url, type account_onboarding). Returns link URL. Handles “not signed up for Connect” error message for dashboard.

### 7.2 Connect status — `app/api/stripe/connect-status/route.ts`

- **GET:** Session required. Returns connected, chargesEnabled, payoutsEnabled, detailsSubmitted, requirementsCurrentlyDue, requirementsPastDue, reason (NOT_CONNECTED | HEALTHY | RESTRICTED | STRIPE_ERROR). Used by settings UI to show connection state.

---

## 8. Invoice PDF and purchase emails

### 8.1 `lib/invoice-pdf-server.ts`

- **generateInvoicePDF(order):** Builds A4 PDF with seller/buyer as FROM/TO, line item (product, qty, unit price, total), subtotal ex GST, delivery, GST 10%, total inc GST, platform fee (3.5% min $1.50), amount to seller. Invoice number GX-INV-{id slice}. Text states seller is supplier; GalaxRX facilitates. Returns Buffer.

**Review:** GST label is fixed “GST (10%)”; if order was GST-free, invoice would still show 10% unless order.gstAmount is 0 (then display could be misleading). Totals are computed from order fields; no recalculation.

### 8.2 `lib/resend.ts` (finance-related)

- **sendNewSale(email, productName, buyerName):** “You sold … — buyer will contact you”. Used after order create in webhook.
- **sendPurchaseConfirmed(email, orderId, { invoicePdfBuffer, invoiceFileName }):** “Purchase confirmed”, optional PDF attachment. Used in webhook for buyer.

---

## 9. Admin stats and reconciliation

### 9.1 `app/api/admin/stats/route.ts`

- **GET:** Admin only. Aggregates orders with status in [PAID, SHIPPED, DELIVERED]: totalGMV (sum grossAmount), platformFeesCollected (sum platformFee). Also pharmacy counts and new registrations (7 days). All from DB; no Stripe.

### 9.2 `app/api/admin/reconciliation/route.ts`

- **GET:** Admin only. Fetches orders with source=STRIPE and non-null stripePaymentId. For each, retrieves PaymentIntent from Stripe: compares status (must be succeeded) and amount (order total in cents vs pi.amount). Pushes mismatches (wrong status, amount mismatch, or PI not found). Also returns manual order count, StripeEvent PENDING count, StripeEvent FAILED count. Use for audit and finding sync issues.

---

## 10. Database schema (finance-related)

**File:** `prisma/schema.prisma` (excerpts)

**Pharmacy (finance fields):**
- stripeAccountId, stripeCustomerId (String?)
- stripeChargesEnabled, stripePayoutsEnabled (Boolean, default true)
- tradeCount (Int, default 0)

**Listing (finance fields):**
- quantityPacks, reservedQty (Int; available = quantityPacks - reservedQty)
- pricePerPack (Float, ex GST)
- deliveryFee (Float, default 0, ex GST)
- isGstFree (Boolean?; null = REVIEW_REQUIRED)

**Order:**
- listingId?, wantedOfferId?, buyerId, sellerId, quantity, unitPrice, grossAmount, deliveryFee, platformFee, gstAmount, netAmount
- stripePaymentId (String?, unique) — prevents duplicate orders per PI
- source (OrderSource: STRIPE | MANUAL)
- status (OrderStatus: PENDING, PAID, SHIPPED, DELIVERED, DISPUTED, DISPUTE_LOST, CANCELLED, REFUNDED, REFUNDED_PARTIAL, REFUNDED_FULL)
- disputedAt, disputeClosedAt, stripeDisputeId

**StripeEvent:**
- eventId (unique), type, payloadJson, processingStatus (PENDING | PROCESSED | FAILED), processedAt, errorMessage

**PaymentAttempt:**
- idempotencyKey (unique), buyerId, sellerId, listingId?, wantedOfferId?, quantity, deliveryFeeExGstCents, grossAmountCents, platformFeeCents, gstAmountCents, totalChargedCents, netToSellerCents, status, stripePaymentIntentId, expiresAt

**Refund:**
- orderId, stripeRefundId (unique?), amountCents, reason, initiatorId

**Enums:**
- OrderSource: STRIPE, MANUAL
- OrderStatus: PENDING, PAID, SHIPPED, DELIVERED, DISPUTED, DISPUTE_LOST, CANCELLED, REFUNDED, REFUNDED_PARTIAL, REFUNDED_FULL

---

## Summary for reviewers

- **Single source of fee/tax:** Platform fee in `lib/stripe.ts`; GST rate and classification in `lib/tax.ts`; create-payment-intent and webhook (fallback) and manual order and refund all must stay consistent.
- **Charge model:** Env `STRIPE_USE_DIRECT_CHARGES` drives create-payment-intent and refund (destination vs direct). Refund reads chargeModel from PI metadata.
- **Idempotency:** Stripe events by event.id; orders by stripePaymentId. Create-payment-intent uses client or server idempotency key for Stripe. Refund and manual order have no idempotency.
- **Risks to stress-test:** (1) Webhook listing path: two separate listing updates (quantityPacks then reservedQty)—failure between them. (2) Reservation release: no cron yet; reservedQty can stay high if PI never succeeds. (3) Partial refund: no stock restore. (4) Tax: REVIEW_REQUIRED still charges 10%; GST-free must be set explicitly on listing. (5) Reconciliation: run regularly to catch PI/order amount or status mismatches.

End of finance code review bundle.
