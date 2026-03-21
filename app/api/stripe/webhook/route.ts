import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { releaseListingReservationIfActive } from "@/lib/listing-reservation";
import { releaseCartCheckoutReservations } from "@/lib/cart-checkout-reservation";
import {
  sendNewSale,
  sendPurchaseConfirmed,
  type InvoiceEmailSummary,
} from "@/lib/resend";
import { runOncePerPaymentIntentEmail } from "@/lib/purchase-email-dedup";
import { shouldSendBuyerPurchaseConfirmationEmail } from "@/lib/email-preferences";
import { revalidateMarketplaceAfterPurchase } from "@/lib/revalidate-marketplace";
import { generateInvoicePDF } from "@/lib/invoice-pdf-server";
import { syncPharmacyFromStripeAccount } from "@/lib/stripe-connect";
import type { Prisma } from "@prisma/client";

type BuyerNotifyRow = {
  email: string | null;
  name: string | null;
  notifyPurchase: boolean | null;
} | null;

/** Prefer buyer row from persisted order (authoritative after payment); fall back to metadata id. */
async function resolveBuyerForPurchaseEmail(
  firstOrderId: string | undefined,
  fallbackBuyerId: string | undefined
): Promise<BuyerNotifyRow> {
  if (firstOrderId) {
    const row = await prisma.order.findUnique({
      where: { id: firstOrderId },
      select: { buyer: { select: { email: true, name: true, notifyPurchase: true } } },
    });
    if (row?.buyer?.email?.trim()) return row.buyer;
  }
  if (fallbackBuyerId) {
    return prisma.pharmacy.findUnique({
      where: { id: fallbackBuyerId },
      select: { email: true, name: true, notifyPurchase: true },
    });
  }
  return null;
}

/** No further offers once the last unit is sold (idempotent if already rejected). */
async function closeListingNegotiationsWhenSoldOut(
  tx: Prisma.TransactionClient,
  listingId: string
) {
  await tx.listingNegotiation.updateMany({
    where: {
      listingId,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    data: { status: "REJECTED" },
  });
}

/**
 * Platform Stripe webhook: processes events for destination charges only.
 * PaymentIntents are created on the platform account; payment_intent.succeeded
 * and dispute events are for platform-owned charges. Direct charge mode is
 * disabled; when implemented, direct charges would require Connect/connected-account
 * webhook handling.
 */

/** Parsed payment intent payload for success handling */
type ParsedPayment = {
  qty: number;
  buyerId: string;
  sellerId: string;
  unitPrice: number;
  grossAmount: number;
  deliveryFee: number;
  platformFee: number;
  gstAmount: number;
  netAmount: number;
};

/** Result of successful listing payment processing (for post-commit notifications) */
type ListingPaymentResult = {
  order: { id: string; quantity: number; listingId: string | null };
  productName: string;
  alreadyProcessed: boolean;
};

/** Result of successful wanted-offer payment processing (for post-commit notifications) */
type WantedOfferPaymentResult = {
  order: { id: string; quantity: number; wantedOfferId: string | null };
  productName: string;
  alreadyProcessed: boolean;
};

const LISTING_INVOICE_SELECT = {
  productName: true,
  strength: true,
  packSize: true,
  images: true,
  expiryDate: true,
  condition: true,
  brand: true,
  form: true,
} as const;

function listingForInvoicePdf(l: {
  productName: string;
  strength: string | null;
  packSize: number;
  images: string[];
  expiryDate: Date;
  condition: string;
  brand: string | null;
  form: string | null;
}) {
  return {
    productName: l.productName,
    strength: l.strength,
    packSize: l.packSize,
    imageUrl: Array.isArray(l.images) && l.images[0] ? l.images[0] : null,
    expiryDate: l.expiryDate,
    condition: String(l.condition),
    brand: l.brand,
    form: l.form,
  };
}

/** Listing PaymentAttempt snapshot (cents). Used to build ParsedPayment from platform state. */
type ListingAttemptSnapshot = {
  listingId: string;
  buyerId: string;
  sellerId: string;
  quantity: number;
  deliveryFeeExGstCents: number;
  grossAmountCents: number;
  platformFeeCents: number;
  gstAmountCents: number;
  totalChargedCents: number;
  netToSellerCents: number;
};

/**
 * Recover listing checkout when PaymentAttempt rows are not yet linked to the PaymentIntent
 * (race) or missing — metadata on the PI is written at create time.
 */
function buildParsedPaymentFromListingMetadata(pi: Stripe.PaymentIntent): {
  parsed: ParsedPayment;
  totalChargedCents: number;
} | null {
  const m = pi.metadata || {};
  if (!m.listingId || !m.buyerId || !m.sellerId) return null;
  const qty = parseInt(String(m.quantity ?? ""), 10);
  if (!Number.isFinite(qty) || qty < 1) return null;
  const grossAmount = parseFloat(String(m.grossAmount ?? "0"));
  const deliveryFee = parseFloat(String(m.deliveryFee ?? "0"));
  const platformFee = parseFloat(String(m.platformFee ?? "0"));
  const gstAmount = parseFloat(String(m.gstAmount ?? "0"));
  const netAmount = parseFloat(String(m.netToSeller ?? "0"));
  const unitPrice = qty > 0 ? grossAmount / qty : 0;
  const totalChargedCents =
    typeof pi.amount_received === "number"
      ? pi.amount_received
      : typeof pi.amount === "number"
        ? pi.amount
        : 0;
  return {
    parsed: {
      qty,
      buyerId: String(m.buyerId),
      sellerId: String(m.sellerId),
      unitPrice,
      grossAmount,
      deliveryFee,
      platformFee,
      gstAmount,
      netAmount,
    },
    totalChargedCents,
  };
}

/** Build ParsedPayment from a listing PaymentAttempt (authoritative snapshot). Cents → dollars. */
function parsedFromListingAttempt(attempt: ListingAttemptSnapshot): ParsedPayment {
  const qty = attempt.quantity;
  const grossAmount = attempt.grossAmountCents / 100;
  const unitPrice = qty > 0 ? grossAmount / qty : 0;
  return {
    qty,
    buyerId: attempt.buyerId,
    sellerId: attempt.sellerId,
    unitPrice,
    grossAmount,
    deliveryFee: attempt.deliveryFeeExGstCents / 100,
    platformFee: attempt.platformFeeCents / 100,
    gstAmount: attempt.gstAmountCents / 100,
    netAmount: attempt.netToSellerCents / 100,
  };
}

/** Build ParsedPayment from any PaymentAttempt snapshot (listing or wanted-offer). Cents → dollars. */
function buildParsedPaymentFromAttempt(attempt: {
  quantity: number;
  buyerId: string;
  sellerId: string;
  deliveryFeeExGstCents: number;
  grossAmountCents: number;
  platformFeeCents: number;
  gstAmountCents: number;
  netToSellerCents: number;
}): ParsedPayment {
  const qty = attempt.quantity;
  const grossAmount = attempt.grossAmountCents / 100;
  const unitPrice = qty > 0 ? grossAmount / qty : 0;
  return {
    qty,
    buyerId: attempt.buyerId,
    sellerId: attempt.sellerId,
    unitPrice,
    grossAmount,
    deliveryFee: attempt.deliveryFeeExGstCents / 100,
    platformFee: attempt.platformFeeCents / 100,
    gstAmount: attempt.gstAmountCents / 100,
    netAmount: attempt.netToSellerCents / 100,
  };
}

/** Persist webhook event for idempotency and audit. Returns existing record if already stored. */
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

type CartCheckoutPostResult = {
  orders: { id: string; listingId: string; productName: string }[];
  alreadyProcessed: boolean;
};

/**
 * Same-seller cart: one PaymentIntent → multiple Order rows (shared shipment).
 */
async function processSuccessfulCartCheckout(
  eventId: string,
  piId: string,
  attemptId: string,
  chargeModel: string
): Promise<CartCheckoutPostResult | null> {
  let attempt = await prisma.cartCheckoutAttempt.findUnique({
    where: { id: attemptId },
    include: { lines: { orderBy: { id: "asc" } } },
  });
  if (!attempt?.lines?.length) {
    attempt = await prisma.cartCheckoutAttempt.findFirst({
      where: { stripePaymentIntentId: piId },
      include: { lines: { orderBy: { id: "asc" } } },
    });
  }
  if (!attempt || attempt.lines.length === 0) return null;
  if (attempt.stripePaymentIntentId && attempt.stripePaymentIntentId !== piId) {
    return null;
  }

  const gstDeliveryCents = Math.max(
    0,
    attempt.gstAmountCents - attempt.lines.reduce((s, l) => s + l.gstProductCents, 0)
  );
  const deliveryExGst = attempt.deliveryFeeExGstCents / 100;

  const out = await prisma.$transaction(async (tx) => {
    await tx.cartCheckoutAttempt.update({
      where: { id: attempt.id },
      data: { stripePaymentIntentId: piId },
    });
    const listingIds = attempt.lines.map((l) => l.listingId);
    const appliedCount = await tx.order.count({
      where: {
        stripePaymentId: piId,
        listingId: { in: listingIds },
        inventoryApplied: true,
      },
    });

    if (appliedCount >= attempt.lines.length) {
      await tx.cartCheckoutAttempt.update({
        where: { id: attempt.id },
        data: { status: "PAID" },
      });
      await tx.stripeEvent.update({
        where: { eventId },
        data: { processedAt: new Date(), processingStatus: "PROCESSED" },
      });
      const rows = await tx.order.findMany({
        where: { stripePaymentId: piId, listingId: { in: listingIds } },
        include: { listing: { select: { productName: true } } },
      });
      return {
        orders: rows.map((o) => ({
          id: o.id,
          listingId: o.listingId!,
          productName: o.listing?.productName ?? "",
        })),
        alreadyProcessed: true,
      };
    }

    const notified: { id: string; listingId: string; productName: string }[] = [];

    for (let i = 0; i < attempt.lines.length; i++) {
      const line = attempt.lines[i];
      const listing = await tx.listing.findUnique({ where: { id: line.listingId } });
      if (!listing) throw new Error(`Cart checkout: listing not found ${line.listingId}`);

      const existing = await tx.order.findFirst({
        where: { stripePaymentId: piId, listingId: line.listingId },
        select: { id: true, quantity: true, inventoryApplied: true },
      });

      if (existing?.inventoryApplied) {
        notified.push({
          id: existing.id,
          listingId: line.listingId,
          productName: listing.productName,
        });
        continue;
      }

      const grossAmount = line.grossAmountCents / 100;
      const qty = line.quantity;
      const unitPrice = qty > 0 ? grossAmount / qty : 0;
      const platformFee = line.platformFeeCents / 100;
      const gstLine = line.gstProductCents / 100;
      const deliveryFee = i === 0 ? deliveryExGst : 0;
      const gstAmount = i === 0 ? gstLine + gstDeliveryCents / 100 : gstLine;
      const netAmount = grossAmount - platformFee + deliveryFee;
      const lineTotalCents =
        line.grossAmountCents +
        line.gstProductCents +
        (i === 0 ? attempt.deliveryFeeExGstCents + gstDeliveryCents : 0);

      if (!existing) {
        if (listing.quantityUnits < qty || listing.reservedUnits < qty) {
          throw new Error(`Cart checkout: stock mismatch ${line.listingId}`);
        }
        const newQty = listing.quantityUnits - qty;
        const newReserved = listing.reservedUnits - qty;

        const order = await tx.order.create({
          data: {
            listingId: line.listingId,
            buyerId: attempt.buyerId,
            sellerId: attempt.sellerId,
            quantity: qty,
            unitPrice,
            grossAmount,
            deliveryFee,
            platformFee,
            gstAmount,
            netAmount,
            stripePaymentId: piId,
            totalChargedCents: lineTotalCents,
            chargeModel,
            source: "STRIPE",
            status: "PAID",
            fulfillmentType: listing.fulfillmentType,
            inventoryApplied: false,
          },
        });

        await tx.listing.update({
          where: { id: line.listingId },
          data: {
            quantityUnits: newQty,
            isActive: newQty > 0,
            reservedUnits: newReserved,
          },
        });
        if (newQty === 0) {
          await closeListingNegotiationsWhenSoldOut(tx, line.listingId);
        }
        await tx.order.update({
          where: { id: order.id },
          data: { inventoryApplied: true },
        });
        await tx.pharmacy.update({
          where: { id: attempt.sellerId },
          data: { tradeCount: { increment: 1 } },
        });
        notified.push({ id: order.id, listingId: line.listingId, productName: listing.productName });
      } else {
        const orderQty = existing.quantity;
        const newQty = listing.quantityUnits - orderQty;
        const newReserved = listing.reservedUnits - orderQty;
        if (newQty < 0 || newReserved < 0) {
          throw new Error(`Cart repair: invariants broken ${line.listingId}`);
        }
        await tx.listing.update({
          where: { id: listing.id },
          data: { quantityUnits: newQty, isActive: newQty > 0, reservedUnits: newReserved },
        });
        if (newQty === 0) {
          await closeListingNegotiationsWhenSoldOut(tx, listing.id);
        }
        await tx.pharmacy.update({
          where: { id: attempt.sellerId },
          data: { tradeCount: { increment: 1 } },
        });
        await tx.order.update({
          where: { id: existing.id },
          data: { inventoryApplied: true },
        });
        notified.push({
          id: existing.id,
          listingId: line.listingId,
          productName: listing.productName,
        });
      }
    }

    await tx.cartCheckoutAttempt.update({
      where: { id: attempt.id },
      data: { status: "PAID" },
    });
    await tx.stripeEvent.update({
      where: { eventId },
      data: { processedAt: new Date(), processingStatus: "PROCESSED" },
    });

    return { orders: notified, alreadyProcessed: false };
  });

  return out;
}

/**
 * Process payment_intent.succeeded for a LISTING order. All core DB changes (order, listing qty,
 * reservedQty, seller tradeCount, StripeEvent) run in one transaction. Idempotent: if order
 * already exists with inventoryApplied, marks event PROCESSED and returns alreadyProcessed.
 * If order exists without inventoryApplied (partial state), repairs in same transaction.
 * chargeModel and totalChargedCents are persisted on the order so refunds can use DB as source of truth.
 */
async function processSuccessfulListingPayment(
  eventId: string,
  piId: string,
  listingId: string,
  parsed: ParsedPayment,
  chargeModel: string,
  totalChargedCents: number
): Promise<ListingPaymentResult> {
  const { qty, buyerId, sellerId, unitPrice, grossAmount, deliveryFee, platformFee, gstAmount, netAmount } = parsed;

  const result = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findFirst({
      where: { stripePaymentId: piId, listingId },
      select: { id: true, quantity: true, listingId: true, inventoryApplied: true },
    });

    if (existingOrder) {
      if (existingOrder.inventoryApplied) {
        await tx.stripeEvent.update({
          where: { eventId },
          data: { processedAt: new Date(), processingStatus: "PROCESSED" },
        });
        await tx.paymentAttempt.updateMany({
          where: { stripePaymentIntentId: piId },
          data: { status: "PAID", reservationStatus: "CONSUMED" },
        });
        const listing = await tx.listing.findUnique({
          where: { id: existingOrder.listingId! },
          select: { productName: true },
        });
        return {
          order: { id: existingOrder.id, quantity: existingOrder.quantity, listingId: existingOrder.listingId },
          productName: listing?.productName ?? "",
          alreadyProcessed: true,
        };
      }
      // Repair: order exists but inventory not applied
      const listing = await tx.listing.findUnique({ where: { id: existingOrder.listingId! } });
      if (!listing) throw new Error("Partial state: order exists but listing not found");
      const orderQty = existingOrder.quantity;
      const newQty = listing.quantityUnits - orderQty;
      const newReserved = listing.reservedUnits - orderQty;
      if (newQty < 0 || newReserved < 0)
        throw new Error(`Partial state: listing invariants broken (quantityUnits=${listing.quantityUnits}, reservedUnits=${listing.reservedUnits}, orderQty=${orderQty})`);
      await tx.listing.update({
        where: { id: listing.id },
        data: { quantityUnits: newQty, isActive: newQty > 0, reservedUnits: newReserved },
      });
      if (newQty === 0) {
        await closeListingNegotiationsWhenSoldOut(tx, listing.id);
      }
      await tx.pharmacy.update({
        where: { id: sellerId },
        data: { tradeCount: { increment: 1 } },
      });
      await tx.order.update({
        where: { id: existingOrder.id },
        data: { inventoryApplied: true },
      });
      await tx.stripeEvent.update({
        where: { eventId },
        data: { processedAt: new Date(), processingStatus: "PROCESSED" },
      });
      await tx.paymentAttempt.updateMany({
        where: { stripePaymentIntentId: piId },
        data: { status: "PAID", reservationStatus: "CONSUMED" },
      });
      return {
        order: { id: existingOrder.id, quantity: orderQty, listingId: listing.id },
        productName: listing.productName,
        alreadyProcessed: false,
      };
    }

    // New order: validate listing and apply all changes atomically
    const listing = await tx.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new Error(`Listing not found: ${listingId}`);
    if (listing.quantityUnits < qty)
      throw new Error(`Insufficient quantity: listing has ${listing.quantityUnits}, requested ${qty}`);
    if (listing.reservedUnits < qty)
      throw new Error(`Insufficient reservedUnits: listing has ${listing.reservedUnits}, requested ${qty}`);

    const newQty = listing.quantityUnits - qty;
    const newReserved = listing.reservedUnits - qty;
    if (newQty < 0 || newReserved < 0)
      throw new Error(`Listing invariants would be violated: quantityUnits=${listing.quantityUnits}, reservedUnits=${listing.reservedUnits}, qty=${qty}`);

    const order = await tx.order.create({
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
        stripePaymentId: piId,
        totalChargedCents,
        chargeModel,
        source: "STRIPE",
        status: "PAID",
        fulfillmentType: listing.fulfillmentType,
        inventoryApplied: false,
      },
    });

    await tx.listing.update({
      where: { id: listingId },
      data: { quantityUnits: newQty, isActive: newQty > 0, reservedUnits: newReserved },
    });
    if (newQty === 0) {
      await closeListingNegotiationsWhenSoldOut(tx, listingId);
    }
    await tx.pharmacy.update({
      where: { id: sellerId },
      data: { tradeCount: { increment: 1 } },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { inventoryApplied: true },
    });
    await tx.stripeEvent.update({
      where: { eventId },
      data: { processedAt: new Date(), processingStatus: "PROCESSED" },
    });
    await tx.paymentAttempt.updateMany({
      where: { stripePaymentIntentId: piId },
      data: { status: "PAID", reservationStatus: "CONSUMED" },
    });

    return {
      order: { id: order.id, quantity: qty, listingId },
      productName: listing.productName,
      alreadyProcessed: false,
    };
  });

  return result;
}

/**
 * Process payment_intent.succeeded for a WANTED-OFFER order. All core DB changes (order,
 * seller tradeCount, StripeEvent) run in one transaction. Uses inventoryApplied as the
 * canonical "core post-payment side effects applied" marker (no listing inventory for
 * wanted-offer; here it means seller tradeCount and event state are applied). Idempotent:
 * existing order + inventoryApplied true => already processed; existing order + false =>
 * repair path (increment tradeCount once, set inventoryApplied true).
 * chargeModel and totalChargedCents are persisted on the order so refunds can use DB as source of truth.
 */
async function processSuccessfulWantedOfferPayment(
  eventId: string,
  piId: string,
  wantedOfferId: string,
  parsed: ParsedPayment,
  chargeModel: string,
  totalChargedCents: number
): Promise<WantedOfferPaymentResult> {
  const { qty, buyerId, sellerId, unitPrice, grossAmount, deliveryFee, platformFee, gstAmount, netAmount } = parsed;

  const result = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findFirst({
      where: { stripePaymentId: piId, wantedOfferId },
      select: { id: true, quantity: true, wantedOfferId: true, inventoryApplied: true },
    });

    if (existingOrder) {
      if (existingOrder.inventoryApplied) {
        await tx.stripeEvent.update({
          where: { eventId },
          data: { processedAt: new Date(), processingStatus: "PROCESSED" },
        });
        await tx.paymentAttempt.updateMany({
          where: { stripePaymentIntentId: piId },
          data: { status: "PAID", reservationStatus: "CONSUMED" },
        });
        const offer = await tx.wantedOffer.findUnique({
          where: { id: existingOrder.wantedOfferId! },
          include: { wantedItem: true },
        });
        return {
          order: { id: existingOrder.id, quantity: existingOrder.quantity, wantedOfferId: existingOrder.wantedOfferId },
          productName: offer?.wantedItem?.productName ?? "",
          alreadyProcessed: true,
        };
      }
      // Repair: order exists but core side effects (tradeCount) not applied
      await tx.pharmacy.update({
        where: { id: sellerId },
        data: { tradeCount: { increment: 1 } },
      });
      await tx.order.update({
        where: { id: existingOrder.id },
        data: { inventoryApplied: true },
      });
      await tx.stripeEvent.update({
        where: { eventId },
        data: { processedAt: new Date(), processingStatus: "PROCESSED" },
      });
      await tx.paymentAttempt.updateMany({
        where: { stripePaymentIntentId: piId },
        data: { status: "PAID", reservationStatus: "CONSUMED" },
      });
      const offer = await tx.wantedOffer.findUnique({
        where: { id: existingOrder.wantedOfferId! },
        include: { wantedItem: true },
      });
      return {
        order: { id: existingOrder.id, quantity: existingOrder.quantity, wantedOfferId: existingOrder.wantedOfferId },
        productName: offer?.wantedItem?.productName ?? "",
        alreadyProcessed: false,
      };
    }

    // New order: create with inventoryApplied false, apply side effects, then set true
    const offer = await tx.wantedOffer.findUnique({
      where: { id: wantedOfferId },
      include: { wantedItem: true },
    });
    if (!offer) throw new Error(`WantedOffer not found: ${wantedOfferId}`);

    const order = await tx.order.create({
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
        stripePaymentId: piId,
        totalChargedCents,
        chargeModel,
        source: "STRIPE",
        status: "PAID",
        fulfillmentType: "NATIONAL_SHIPPING",
        inventoryApplied: false,
      },
    });
    await tx.pharmacy.update({
      where: { id: sellerId },
      data: { tradeCount: { increment: 1 } },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { inventoryApplied: true },
    });
    await tx.stripeEvent.update({
      where: { eventId },
      data: { processedAt: new Date(), processingStatus: "PROCESSED" },
    });
    await tx.paymentAttempt.updateMany({
      where: { stripePaymentIntentId: piId },
      data: { status: "PAID", reservationStatus: "CONSUMED" },
    });

    return {
      order: { id: order.id, quantity: qty, wantedOfferId: offer.id },
      productName: offer.wantedItem.productName,
      alreadyProcessed: false,
    };
  });

  return result;
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
  // FAILED: acknowledge so Stripe does not redeliver; recovery is via scheduled retry worker (see api/admin/stripe-retry-failed + vercel.json crons).
  if (processingStatus === "FAILED") {
    return NextResponse.json({ received: true });
  }

  try {
    await processStripeEventPayload(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date(), processingStatus: "FAILED", errorMessage: msg },
    }).catch(() => {});
    throw err;
  }
}

/** Process a single Stripe event (payload already persisted). Throws on failure so caller can mark FAILED and optionally rethrow. Used by webhook and retry job. */
export async function processStripeEventPayload(event: Stripe.Event): Promise<void> {
  function failEvent(errorMessage: string): never {
    throw new Error(errorMessage);
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const piId = pi.id;
    const metadata = pi.metadata || {};
    const chargeModel = (metadata.chargeModel as string) ?? "destination";

    const cartAttemptId = metadata.cartCheckoutAttemptId as string | undefined;
    if (cartAttemptId) {
      const cartResult = await processSuccessfulCartCheckout(
        event.id,
        piId,
        cartAttemptId,
        chargeModel
      );
      if (!cartResult) {
        failEvent("Cart checkout attempt not found or PaymentIntent mismatch");
      }
      if (!cartResult.alreadyProcessed) {
        revalidateMarketplaceAfterPurchase();
        try {
          const buyerIdMeta = metadata.buyerId as string | undefined;
          const sellerIdMeta = metadata.sellerId as string;
          const buyer = await resolveBuyerForPurchaseEmail(
            cartResult.orders[0]?.id,
            buyerIdMeta
          );
          const seller = await prisma.pharmacy.findUnique({
            where: { id: sellerIdMeta },
            select: { email: true, notifyNewSale: true },
          });

          const emailSummaries: InvoiceEmailSummary[] = [];
          const invoiceAttachments: { filename: string; content: Buffer }[] = [];

          for (const ord of cartResult.orders) {
            const orderIdShort = `GX-${ord.id.slice(-5).toUpperCase()}`;
            try {
              const fullOrder = await prisma.order.findUnique({
                where: { id: ord.id },
                include: {
                  listing: { select: LISTING_INVOICE_SELECT },
                  buyer: {
                    select: {
                      name: true,
                      address: true,
                      suburb: true,
                      state: true,
                      postcode: true,
                      abn: true,
                    },
                  },
                  seller: {
                    select: {
                      name: true,
                      address: true,
                      suburb: true,
                      state: true,
                      postcode: true,
                      abn: true,
                    },
                  },
                },
              });
              if (fullOrder?.listing) {
                emailSummaries.push({
                  productName: fullOrder.listing.productName,
                  quantity: fullOrder.quantity,
                  unitPrice: fullOrder.unitPrice,
                  grossExGst: fullOrder.grossAmount,
                  imageUrl: fullOrder.listing.images?.[0] ?? null,
                });
                const invoicePdfBuffer = await generateInvoicePDF({
                  id: fullOrder.id,
                  quantity: fullOrder.quantity,
                  unitPrice: fullOrder.unitPrice,
                  grossAmount: fullOrder.grossAmount,
                  deliveryFee: fullOrder.deliveryFee ?? 0,
                  gstAmount: fullOrder.gstAmount,
                  platformFee: fullOrder.platformFee,
                  netAmount: fullOrder.netAmount,
                  createdAt: fullOrder.createdAt,
                  listing: listingForInvoicePdf(fullOrder.listing),
                  buyer: fullOrder.buyer,
                  seller: fullOrder.seller,
                });
                invoiceAttachments.push({
                  filename: `invoice-${orderIdShort}.pdf`,
                  content: invoicePdfBuffer,
                });
              } else if (fullOrder) {
                emailSummaries.push({
                  productName: ord.productName,
                  quantity: fullOrder.quantity,
                  unitPrice: fullOrder.unitPrice,
                  grossExGst: fullOrder.grossAmount,
                  imageUrl: null,
                });
              }
            } catch (e) {
              console.error("[GalaxRX] Invoice PDF failed (cart line):", e);
            }
          }

          if (cartResult.orders.length > 0) {
            const primaryRef = `GX-${cartResult.orders[0].id.slice(-5).toUpperCase()}`;
            const primaryProductName = cartResult.orders[0].productName || "Cart items";

            if (seller?.email && seller.notifyNewSale) {
              await runOncePerPaymentIntentEmail(piId, "SELLER_NEW_SALE", () =>
                sendNewSale(seller.email, primaryProductName, buyer?.name ?? "A pharmacy", primaryRef, {
                  emailSummaries: emailSummaries.length > 0 ? emailSummaries : undefined,
                  emailSummary:
                    emailSummaries.length === 0
                      ? {
                          productName: primaryProductName,
                          quantity: cartResult.orders.length,
                          unitPrice: 0,
                          grossExGst: 0,
                        }
                      : undefined,
                  invoiceAttachments: invoiceAttachments.length > 0 ? invoiceAttachments : undefined,
                })
              );
            }
            if (shouldSendBuyerPurchaseConfirmationEmail(buyer)) {
              await runOncePerPaymentIntentEmail(piId, "BUYER_PURCHASE_CONFIRMED", () =>
                sendPurchaseConfirmed(buyer!.email!.trim(), primaryRef, {
                  emailSummaries: emailSummaries.length > 0 ? emailSummaries : undefined,
                  emailSummary:
                    emailSummaries.length === 0
                      ? {
                          productName: primaryProductName,
                          quantity: cartResult.orders.length,
                          unitPrice: 0,
                          grossExGst: 0,
                        }
                      : undefined,
                  invoiceAttachments: invoiceAttachments.length > 0 ? invoiceAttachments : undefined,
                })
              );
            } else {
              console.warn("[GalaxRX] Buyer purchase confirmation email skipped (cart)", {
                paymentIntent: piId,
                reason: !buyer?.email?.trim()
                  ? "no_buyer_email"
                  : buyer.notifyPurchase === false
                    ? "notify_purchase_disabled"
                    : "unknown",
              });
            }
          }
        } catch (e) {
          console.error("[GalaxRX] Post-commit notification failed (cart):", e);
        }
      }
      return;
    }

    const listingAttempts = await prisma.paymentAttempt.findMany({
      where: { stripePaymentIntentId: piId },
      select: {
        id: true,
        listingId: true,
        wantedOfferId: true,
        buyerId: true,
        sellerId: true,
        quantity: true,
        deliveryFeeExGstCents: true,
        grossAmountCents: true,
        platformFeeCents: true,
        gstAmountCents: true,
        totalChargedCents: true,
        netToSellerCents: true,
        chargeModel: true,
      },
    });

    let singleAttempt = listingAttempts[0] ?? null;
    if (listingAttempts.length > 1) {
      const withListing = listingAttempts.filter((a) => a.listingId);
      singleAttempt = (withListing[0] ?? listingAttempts[0]) ?? null;
      console.warn("[GalaxRX] Multiple PaymentAttempts for PaymentIntent; using one", {
        piId,
        count: listingAttempts.length,
      });
    }

    if (singleAttempt?.listingId) {
      if (singleAttempt.quantity < 1) {
        failEvent("Invalid quantity on PaymentAttempt (listing)");
      }
      const snapshot: ListingAttemptSnapshot = {
        listingId: singleAttempt.listingId,
        buyerId: singleAttempt.buyerId,
        sellerId: singleAttempt.sellerId,
        quantity: singleAttempt.quantity,
        deliveryFeeExGstCents: singleAttempt.deliveryFeeExGstCents,
        grossAmountCents: singleAttempt.grossAmountCents,
        platformFeeCents: singleAttempt.platformFeeCents,
        gstAmountCents: singleAttempt.gstAmountCents,
        totalChargedCents: singleAttempt.totalChargedCents,
        netToSellerCents: singleAttempt.netToSellerCents,
      };
      const parsed = parsedFromListingAttempt(snapshot);
      const listingChargeModel = singleAttempt.chargeModel ?? "destination";
      try {
        const result = await processSuccessfulListingPayment(event.id, piId, singleAttempt.listingId, parsed, listingChargeModel, singleAttempt.totalChargedCents);
        if (!result.alreadyProcessed) {
          revalidateMarketplaceAfterPurchase();
          try {
            const orderIdShort = `GX-${result.order.id.slice(-5).toUpperCase()}`;
            const buyer = await resolveBuyerForPurchaseEmail(result.order.id, parsed.buyerId);
            const seller = await prisma.pharmacy.findUnique({
              where: { id: parsed.sellerId },
              select: { email: true, notifyNewSale: true },
            });
            let invoicePdfBuffer: Buffer | undefined;
            let emailSummary: InvoiceEmailSummary | undefined;
            try {
              const fullOrder = await prisma.order.findUnique({
                where: { id: result.order.id },
                include: {
                  listing: { select: LISTING_INVOICE_SELECT },
                  buyer: { select: { name: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
                  seller: { select: { name: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
                },
              });
              if (fullOrder?.listing) {
                emailSummary = {
                  productName: fullOrder.listing.productName,
                  quantity: fullOrder.quantity,
                  unitPrice: fullOrder.unitPrice,
                  grossExGst: fullOrder.grossAmount,
                  imageUrl: fullOrder.listing.images?.[0] ?? null,
                };
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
                  listing: listingForInvoicePdf(fullOrder.listing),
                  buyer: fullOrder.buyer,
                  seller: fullOrder.seller,
                });
              }
            } catch (e) {
              console.error("[GalaxRX] Invoice PDF generation failed (listing):", e);
            }
            const pdfName = invoicePdfBuffer ? `invoice-${orderIdShort}.pdf` : undefined;
            if (seller?.email && seller.notifyNewSale) {
              await runOncePerPaymentIntentEmail(piId, "SELLER_NEW_SALE", () =>
                sendNewSale(seller.email, result.productName, buyer?.name ?? "A pharmacy", orderIdShort, {
                  invoicePdfBuffer: invoicePdfBuffer ?? undefined,
                  invoiceFileName: pdfName,
                  emailSummary,
                })
              );
            }
            if (shouldSendBuyerPurchaseConfirmationEmail(buyer)) {
              await runOncePerPaymentIntentEmail(piId, "BUYER_PURCHASE_CONFIRMED", () =>
                sendPurchaseConfirmed(buyer!.email!.trim(), orderIdShort, {
                  invoicePdfBuffer: invoicePdfBuffer ?? undefined,
                  invoiceFileName: pdfName,
                  emailSummary,
                })
              );
            } else {
              console.warn("[GalaxRX] Buyer purchase confirmation email skipped (listing)", {
                paymentIntent: piId,
                orderId: result.order.id,
                reason: !buyer?.email?.trim()
                  ? "no_buyer_email"
                  : buyer.notifyPurchase === false
                    ? "notify_purchase_disabled"
                    : "unknown",
              });
            }
          } catch (e) {
            console.error("[GalaxRX] Post-commit notification failed (listing):", e);
          }
        }
        return;
      } catch (err) {
        throw err;
      }
    }

    if (
      !singleAttempt?.listingId &&
      metadata.listingId &&
      !metadata.cartCheckoutAttemptId
    ) {
      const fromMeta = buildParsedPaymentFromListingMetadata(pi);
      if (fromMeta) {
        const listingIdMeta = String(metadata.listingId);
        try {
          const result = await processSuccessfulListingPayment(
            event.id,
            piId,
            listingIdMeta,
            fromMeta.parsed,
            chargeModel,
            fromMeta.totalChargedCents
          );
          if (!result.alreadyProcessed) {
            revalidateMarketplaceAfterPurchase();
            try {
              const orderIdShort = `GX-${result.order.id.slice(-5).toUpperCase()}`;
              const buyer = await resolveBuyerForPurchaseEmail(
                result.order.id,
                fromMeta.parsed.buyerId
              );
              const seller = await prisma.pharmacy.findUnique({
                where: { id: fromMeta.parsed.sellerId },
                select: { email: true, notifyNewSale: true },
              });
              let invoicePdfBuffer: Buffer | undefined;
              let emailSummary: InvoiceEmailSummary | undefined;
              try {
                const fullOrder = await prisma.order.findUnique({
                  where: { id: result.order.id },
                  include: {
                    listing: { select: LISTING_INVOICE_SELECT },
                    buyer: { select: { name: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
                    seller: { select: { name: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
                  },
                });
                if (fullOrder?.listing) {
                  emailSummary = {
                    productName: fullOrder.listing.productName,
                    quantity: fullOrder.quantity,
                    unitPrice: fullOrder.unitPrice,
                    grossExGst: fullOrder.grossAmount,
                    imageUrl: fullOrder.listing.images?.[0] ?? null,
                  };
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
                    listing: listingForInvoicePdf(fullOrder.listing),
                    buyer: fullOrder.buyer,
                    seller: fullOrder.seller,
                  });
                }
              } catch (e) {
                console.error("[GalaxRX] Invoice PDF (listing metadata path):", e);
              }
              const pdfName = invoicePdfBuffer ? `invoice-${orderIdShort}.pdf` : undefined;
              if (seller?.email && seller.notifyNewSale) {
                await runOncePerPaymentIntentEmail(piId, "SELLER_NEW_SALE", () =>
                  sendNewSale(seller.email, result.productName, buyer?.name ?? "A pharmacy", orderIdShort, {
                    invoicePdfBuffer: invoicePdfBuffer ?? undefined,
                    invoiceFileName: pdfName,
                    emailSummary,
                  })
                );
              }
              if (shouldSendBuyerPurchaseConfirmationEmail(buyer)) {
                await runOncePerPaymentIntentEmail(piId, "BUYER_PURCHASE_CONFIRMED", () =>
                  sendPurchaseConfirmed(buyer!.email!.trim(), orderIdShort, {
                    invoicePdfBuffer: invoicePdfBuffer ?? undefined,
                    invoiceFileName: pdfName,
                    emailSummary,
                  })
                );
              } else {
                console.warn("[GalaxRX] Buyer purchase confirmation email skipped (listing metadata)", {
                  paymentIntent: piId,
                  orderId: result.order.id,
                  reason: !buyer?.email?.trim()
                    ? "no_buyer_email"
                    : buyer.notifyPurchase === false
                      ? "notify_purchase_disabled"
                      : "unknown",
                });
              }
            } catch (e) {
              console.error("[GalaxRX] Post-commit failed (listing metadata path):", e);
            }
          }
          return;
        } catch (metaErr) {
          console.error("[GalaxRX] Listing checkout from PI metadata failed:", metaErr);
        }
      }
    }

    if (singleAttempt && !singleAttempt.listingId && !singleAttempt.wantedOfferId) {
      failEvent("PaymentAttempt has neither listingId nor wantedOfferId");
    }

    // Wanted-offer: authoritative path from persisted PaymentAttempt snapshot only.
    if (singleAttempt?.wantedOfferId) {
      const wantedOfferId = singleAttempt.wantedOfferId;
      if (singleAttempt.quantity < 1) {
        failEvent("Invalid quantity on PaymentAttempt (wanted-offer)");
      }
      const parsed = buildParsedPaymentFromAttempt(singleAttempt);
      const wantedOfferChargeModel = singleAttempt.chargeModel ?? "destination";
      const wantedOfferTotalChargedCents = singleAttempt.totalChargedCents;
      try {
        const result = await processSuccessfulWantedOfferPayment(event.id, piId, wantedOfferId, parsed, wantedOfferChargeModel, wantedOfferTotalChargedCents);
        if (!result.alreadyProcessed) {
          revalidateMarketplaceAfterPurchase();
          try {
            const orderIdShort = `GX-${result.order.id.slice(-5).toUpperCase()}`;
            const buyer = await resolveBuyerForPurchaseEmail(result.order.id, parsed.buyerId);
            const seller = await prisma.pharmacy.findUnique({
              where: { id: parsed.sellerId },
              select: { email: true, notifyNewSale: true },
            });
            let invoicePdfBuffer: Buffer | undefined;
            let emailSummaryW: InvoiceEmailSummary | undefined;
            try {
              const fullOrder = await prisma.order.findUnique({
                where: { id: result.order.id },
                include: {
                  wantedOffer: {
                    include: {
                      wantedItem: { select: { productName: true, strength: true, imageUrl: true } },
                    },
                  },
                  buyer: { select: { name: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
                  seller: { select: { name: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
                },
              });
              if (fullOrder?.wantedOffer?.wantedItem) {
                const wi = fullOrder.wantedOffer.wantedItem;
                emailSummaryW = {
                  productName: wi.productName,
                  quantity: fullOrder.quantity,
                  unitPrice: fullOrder.unitPrice,
                  grossExGst: fullOrder.grossAmount,
                  imageUrl: wi.imageUrl ?? null,
                };
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
                  listing: {
                    productName: wi.productName,
                    strength: wi.strength ?? null,
                    packSize: undefined,
                    imageUrl: wi.imageUrl ?? null,
                    expiryDate: null,
                    condition: null,
                    brand: null,
                    form: null,
                  },
                  buyer: fullOrder.buyer,
                  seller: fullOrder.seller,
                });
              }
            } catch (e) {
              console.error("[GalaxRX] Invoice PDF generation failed (wanted offer):", e);
            }
            const pdfNameW = invoicePdfBuffer ? `invoice-${orderIdShort}.pdf` : undefined;
            if (seller?.email && seller.notifyNewSale) {
              await runOncePerPaymentIntentEmail(piId, "SELLER_NEW_SALE", () =>
                sendNewSale(seller.email, result.productName, buyer?.name ?? "A pharmacy", orderIdShort, {
                  invoicePdfBuffer: invoicePdfBuffer ?? undefined,
                  invoiceFileName: pdfNameW,
                  emailSummary: emailSummaryW,
                })
              );
            }
            if (shouldSendBuyerPurchaseConfirmationEmail(buyer)) {
              await runOncePerPaymentIntentEmail(piId, "BUYER_PURCHASE_CONFIRMED", () =>
                sendPurchaseConfirmed(buyer!.email!.trim(), orderIdShort, {
                  invoicePdfBuffer: invoicePdfBuffer ?? undefined,
                  invoiceFileName: pdfNameW,
                  emailSummary: emailSummaryW,
                })
              );
            } else {
              console.warn("[GalaxRX] Buyer purchase confirmation email skipped (wanted offer)", {
                paymentIntent: piId,
                orderId: result.order.id,
                reason: !buyer?.email?.trim()
                  ? "no_buyer_email"
                  : buyer.notifyPurchase === false
                    ? "notify_purchase_disabled"
                    : "unknown",
              });
            }
          } catch (e) {
            console.error("[GalaxRX] Post-commit notification failed (wanted offer):", e);
          }
        }
        return;
      } catch (err) {
        throw err;
      }
    }

    if (!singleAttempt && metadata.wantedOfferId) {
      failEvent("No PaymentAttempt found for PaymentIntent (wanted-offer requires PaymentAttempt)");
    }

    if (!singleAttempt && metadata.listingId) {
      failEvent("No PaymentAttempt found for PaymentIntent (listing requires PaymentAttempt)");
    }

    if (!metadata.listingId && !metadata.wantedOfferId) {
      failEvent("Neither listingId nor wantedOfferId in metadata");
    }

    failEvent("Unhandled payment_intent.succeeded: no listing PaymentAttempt and not wanted-offer");
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const piId = pi.id;
    const terminalStatus = event.type === "payment_intent.canceled" ? "CANCELED" : "FAILED";
    try {
      await prisma.$transaction(async (tx) => {
        await releaseCartCheckoutReservations(tx, piId);
        const result = await releaseListingReservationIfActive(tx, { stripePaymentIntentId: piId });
        const attempt = await tx.paymentAttempt.findFirst({
          where: { stripePaymentIntentId: piId },
          select: { id: true },
        });
        if (attempt) {
          await tx.paymentAttempt.update({
            where: { id: attempt.id },
            data: { status: terminalStatus },
          });
        }
        await tx.cartCheckoutAttempt.updateMany({
          where: { stripePaymentIntentId: piId, status: { notIn: ["PAID", "RELEASED"] } },
          data: { status: terminalStatus },
        });
      });
    } catch (e) {
      console.error("[GalaxRX] Reservation release failed for PI:", piId, e);
    }
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date(), processingStatus: "PROCESSED" },
    }).catch(() => {});
  }

  if (event.type === "charge.dispute.created" || event.type === "charge.dispute.updated") {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
    if (chargeId && stripe) {
      try {
        const charge = await stripe.charges.retrieve(chargeId);
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) {
          const orders = await prisma.order.findMany({
            where: { stripePaymentId: paymentIntentId },
            select: { id: true },
          });
          for (const order of orders) {
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

  // charge.dispute.closed: outcome is final. "lost" = funds permanently gone from platform.
  // With destination charges, GalaxRX bears primary loss. With direct charges (target
  // architecture), this would hit the seller's account instead.
  if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
    if (chargeId && stripe) {
      try {
        const charge = await stripe.charges.retrieve(chargeId);
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (paymentIntentId) {
          const orders = await prisma.order.findMany({
            where: { stripePaymentId: paymentIntentId },
            select: { id: true },
          });
          const status =
            dispute.status === "lost"
              ? "DISPUTE_LOST"
              : dispute.status === "won"
                ? "PAID"
                : "DISPUTED";
          for (const order of orders) {
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
    await syncPharmacyFromStripeAccount(account);
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processedAt: new Date(), processingStatus: "PROCESSED" },
    }).catch(() => {});
  }
}
