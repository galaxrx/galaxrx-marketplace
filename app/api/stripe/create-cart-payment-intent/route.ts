import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getChargeModel, DirectChargeNotSupportedError } from "@/lib/stripe-charge-model";
import { calculateDestinationChargeAmounts } from "@/lib/destination-charge";
import { quoteSellerCart } from "@/lib/cart-checkout-quote";
import { unitPriceExGstFromPackPrice } from "@/lib/listing-units";
import { isValidAustralianPostcodeForShipping } from "@/lib/australian-postcode";
import { releaseExpiredReservationsForListingIds } from "@/lib/listing-reservation";
import { CHECKOUT_RESERVATION_MINUTES } from "@/lib/checkout-ttl";
import { activeAcceptedListingNegotiationWhere } from "@/lib/listing-negotiation-hold";
import { CHECKOUT_BLOCKED_PLATFORM_FEE_CODE } from "@/lib/pricing";
import Stripe from "stripe";
import {
  isStripeConnectAccountNotFoundError,
  SELLER_STRIPE_ACCOUNT_INVALID_MESSAGE,
  stripeDestinationErrorResponse,
} from "@/lib/stripe-account-errors";

const LISTING_RESERVATION_EXPIRY_MINUTES = CHECKOUT_RESERVATION_MINUTES;
const CART_IDEMPOTENCY_BUCKET_MS = CHECKOUT_RESERVATION_MINUTES * 60 * 1000;

function lineSignature(items: { listingId: string; quantity: number }[]): string {
  const sorted = [...items].sort((a, b) => a.listingId.localeCompare(b.listingId));
  return sorted.map((i) => `${i.listingId}:${i.quantity}`).join("|");
}

function deriveCartIdempotencyKey(buyerId: string, sellerId: string, sig: string): string {
  const base = `${buyerId}:${sellerId}:${sig}`;
  const hash = createHash("sha256").update(base).digest("hex").slice(0, 24);
  const bucket = Math.floor(Date.now() / CART_IDEMPOTENCY_BUCKET_MS);
  return `cart-${hash}-${bucket}`;
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ message: "Stripe is not configured" }, { status: 503 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const buyerId = (session.user as { id: string }).id;
  const pharmacy = await prisma.pharmacy.findUnique({ where: { id: buyerId } });
  if (!pharmacy?.isVerified) {
    return NextResponse.json({ message: "Pharmacy must be verified to purchase." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      sellerId,
      items: rawItems,
      deliveryFee,
      shippingTier = "standard",
      useAustraliaPost = false,
    } = body as {
      sellerId?: string;
      items?: { listingId: string; quantity: number }[];
      deliveryFee?: number;
      shippingTier?: "standard" | "express";
      useAustraliaPost?: boolean;
    };

    if (!sellerId || !Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        { message: "sellerId and at least one item are required" },
        { status: 400 }
      );
    }
    if (typeof deliveryFee !== "number" || deliveryFee < 0) {
      return NextResponse.json({ message: "deliveryFee is required" }, { status: 400 });
    }

    const merged = new Map<string, number>();
    for (const row of rawItems) {
      if (!row?.listingId || !row.quantity || row.quantity < 1 || !Number.isInteger(row.quantity)) {
        return NextResponse.json({ message: "Each item needs listingId and a whole quantity ≥ 1" }, { status: 400 });
      }
      merged.set(row.listingId, (merged.get(row.listingId) ?? 0) + row.quantity);
    }
    const items = Array.from(merged.entries()).map(([listingId, quantity]) => ({
      listingId,
      quantity,
    }));
    const sig = lineSignature(items);

    await releaseExpiredReservationsForListingIds(items.map((i) => i.listingId));

    const listings = await prisma.listing.findMany({
      where: { id: { in: items.map((i) => i.listingId) } },
      include: { pharmacy: true },
    });
    if (listings.length !== items.length) {
      return NextResponse.json({ message: "One or more listings were not found" }, { status: 404 });
    }

    for (const l of listings) {
      if (l.pharmacyId !== sellerId) {
        return NextResponse.json(
          { message: "All items in a cart checkout must be from the same seller" },
          { status: 400 }
        );
      }
      if (l.pharmacyId === buyerId) {
        return NextResponse.json({ message: "Cannot buy your own listings" }, { status: 400 });
      }
      if (!l.isActive) {
        return NextResponse.json({ message: `Listing inactive: ${l.productName}` }, { status: 400 });
      }
    }

    const ft = listings[0].fulfillmentType;
    for (const l of listings) {
      if (l.fulfillmentType !== ft) {
        return NextResponse.json(
          {
            message:
              "All items must use the same delivery type (e.g. all national shipping) to combine in one shipment.",
          },
          { status: 400 }
        );
      }
    }

    const sellerPostcode = listings[0].pharmacy.postcode?.trim().replace(/\D/g, "").slice(0, 4) ?? "";
    const canAusPost =
      ft === "NATIONAL_SHIPPING" && isValidAustralianPostcodeForShipping(sellerPostcode);
    const allowCustomDelivery = Boolean(useAustraliaPost && canAusPost);

    if (!listings[0].pharmacy.stripeAccountId) {
      return NextResponse.json({ message: "Seller has not connected their bank account yet" }, { status: 400 });
    }
    const sellerStripeAccountId = listings[0].pharmacy.stripeAccountId;
    try {
      const sellerAccount = await stripe.accounts.retrieve(sellerStripeAccountId);
      if (!sellerAccount.charges_enabled) {
        return NextResponse.json(
          { message: "Seller payment account is currently restricted. Please contact support." },
          { status: 400 }
        );
      }
    } catch (e: unknown) {
      if (isStripeConnectAccountNotFoundError(e)) {
        return NextResponse.json(
          { code: "SELLER_STRIPE_INVALID", message: SELLER_STRIPE_ACCOUNT_INVALID_MESSAGE },
          { status: 400 }
        );
      }
      console.warn("[GalaxRX] Could not verify seller account health for:", sellerStripeAccountId, e);
    }

    const lineInputs: {
      listingId: string;
      quantity: number;
      unitPriceExGst: number;
      isGstFree: boolean | null;
    }[] = [];

    for (const item of items) {
      const listing = listings.find((x) => x.id === item.listingId)!;
      const neg = await prisma.listingNegotiation.findFirst({
        where: { listingId: listing.id, buyerId, ...activeAcceptedListingNegotiationWhere() },
        orderBy: { updatedAt: "desc" },
      });
      const pricePerPack = neg?.proposedPricePerPack ?? listing.pricePerPack;
      const unitPriceExGst = unitPriceExGstFromPackPrice(pricePerPack, listing.packSize);
      lineInputs.push({
        listingId: listing.id,
        quantity: item.quantity,
        unitPriceExGst,
        isGstFree: listing.isGstFree ?? null,
      });
    }

    const quote = quoteSellerCart(
      lineInputs,
      deliveryFee,
      shippingTier === "express" ? "express" : "standard",
      listings.map((l) => ({ id: l.id, deliveryFee: l.deliveryFee })),
      { allowCustomDelivery }
    );
    if (!quote.ok) {
      return NextResponse.json(
        { message: quote.message, code: quote.code },
        {
          status:
            quote.code === "MIXED_GST"
              ? 400
              : quote.code === "TAX_CLASSIFICATION_PENDING"
                ? 403
                : quote.code === CHECKOUT_BLOCKED_PLATFORM_FEE_CODE
                  ? 400
                  : 400,
        }
      );
    }

    const idempotencyScope = `cart:${sellerId}`;
    let idempotencyKey = deriveCartIdempotencyKey(buyerId, sellerId, sig);
    const expiresAt = new Date(Date.now() + LISTING_RESERVATION_EXPIRY_MINUTES * 60 * 1000);

    const existing = await prisma.cartCheckoutAttempt.findUnique({
      where: {
        buyerId_idempotencyScope_idempotencyKey: {
          buyerId,
          idempotencyScope,
          idempotencyKey,
        },
      },
      include: { lines: true },
    });

    if (existing && existing.stripePaymentIntentId && existing.expiresAt > new Date()) {
      if (
        existing.totalChargedCents === quote.totalChargedCents &&
        existing.deliveryFeeExGstCents === quote.deliveryFeeExGstCents &&
        existing.lines.length === quote.lines.length
      ) {
        const pi = await stripe.paymentIntents.retrieve(existing.stripePaymentIntentId);
        if (pi.status === "requires_payment_method" || pi.status === "requires_confirmation") {
          return NextResponse.json({ clientSecret: pi.client_secret });
        }
      }
    }

    getChargeModel();

    let attemptId: string;
    try {
      attemptId = await prisma.$transaction(async (tx) => {
        for (const line of quote.lines) {
          const listing = await tx.listing.findUnique({ where: { id: line.listingId } });
          const avail = (listing?.quantityUnits ?? 0) - (listing?.reservedUnits ?? 0);
          if (!listing || avail < line.quantity) {
            throw new Error("INSUFFICIENT_QUANTITY");
          }
        }

        const attempt = await tx.cartCheckoutAttempt.create({
          data: {
            idempotencyKey,
            idempotencyScope,
            buyerId,
            sellerId,
            deliveryFeeExGstCents: quote.deliveryFeeExGstCents,
            totalChargedCents: quote.totalChargedCents,
            grossAmountCents: quote.grossAmountCents,
            platformFeeCents: quote.platformFeeCents,
            gstAmountCents: quote.gstAmountCents,
            netToSellerCents: quote.netToSellerCents,
            chargeModel: "destination",
            status: "QUOTED",
            expiresAt,
            taxClassification: quote.taxClassification,
            lines: {
              create: quote.lines.map((ln) => ({
                listingId: ln.listingId,
                quantity: ln.quantity,
                grossAmountCents: Math.round(ln.grossAmount * 100),
                platformFeeCents: Math.round(ln.platformFee * 100),
                gstProductCents: Math.round(ln.gstProduct * 100),
                netLineCents: Math.round(ln.netLine * 100),
              })),
            },
          },
        });

        for (const line of quote.lines) {
          await tx.listing.update({
            where: { id: line.listingId },
            data: { reservedUnits: { increment: line.quantity } },
          });
        }
        return attempt.id;
      });
    } catch (e: unknown) {
      const isP2002 =
        e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002";
      if (isP2002) {
        const retry = await prisma.cartCheckoutAttempt.findUnique({
          where: {
            buyerId_idempotencyScope_idempotencyKey: { buyerId, idempotencyScope, idempotencyKey },
          },
        });
        if (retry?.stripePaymentIntentId) {
          const pi = await stripe.paymentIntents.retrieve(retry.stripePaymentIntentId);
          return NextResponse.json({ clientSecret: pi.client_secret });
        }
      }
      if (e instanceof Error && e.message === "INSUFFICIENT_QUANTITY") {
        return NextResponse.json(
          {
            message:
              "Not available at this quantity — the seller does not have enough stock for one or more lines. Lower quantities or refresh your cart.",
          },
          { status: 400 }
        );
      }
      throw e;
    }

    const destAmounts = calculateDestinationChargeAmounts({
      totalChargedCents: quote.totalChargedCents,
      platformFeeCents: quote.platformFeeCents,
      gstAmountCents: quote.gstAmountCents,
      netToSellerCents: quote.netToSellerCents,
    });

    try {
      const piParams: Stripe.PaymentIntentCreateParams = {
        amount: destAmounts.buyerTotalCents,
        currency: "aud",
        application_fee_amount: destAmounts.applicationFeeAmountCents,
        transfer_data: { destination: sellerStripeAccountId },
        metadata: {
          chargeModel: destAmounts.chargeModel,
          cartCheckoutAttemptId: attemptId,
          buyerId,
          sellerId,
          lineCount: String(quote.lines.length),
          grossAmount: String(quote.grossTotal),
          deliveryFee: String(quote.deliveryFeeExGst),
          platformFee: String(quote.platformFeeTotal),
          gstAmount: String(quote.gstAmount),
          netToSeller: String(quote.netToSeller),
          transferToSeller: String(destAmounts.transferToSellerCents / 100),
          taxClassification: quote.taxClassification,
        },
      };

      const paymentIntent = await stripe.paymentIntents.create(piParams, {
        idempotencyKey,
      });

      await prisma.cartCheckoutAttempt.update({
        where: { id: attemptId },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: "PAYMENT_INTENT_CREATED",
        },
      });

      return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (stripeError) {
      await prisma.$transaction(async (tx) => {
        const att = await tx.cartCheckoutAttempt.findUnique({
          where: { id: attemptId },
          include: { lines: true },
        });
        if (!att) return;
        for (const line of att.lines) {
          const listing = await tx.listing.findUnique({
            where: { id: line.listingId },
            select: { reservedUnits: true },
          });
          if (listing) {
            await tx.listing.update({
              where: { id: line.listingId },
              data: { reservedUnits: Math.max(0, listing.reservedUnits - line.quantity) },
            });
          }
        }
        await tx.cartCheckoutAttempt.delete({ where: { id: attemptId } });
      });
      throw stripeError;
    }
  } catch (e) {
    if (e instanceof DirectChargeNotSupportedError) {
      return NextResponse.json({ message: e.message }, { status: 503 });
    }
    const dest = stripeDestinationErrorResponse(e);
    if (dest) {
      return NextResponse.json(dest, { status: 400 });
    }
    console.error("[create-cart-payment-intent]", e);
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed to create payment" },
      { status: 500 }
    );
  }
}
