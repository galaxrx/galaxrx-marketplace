// ============================================================
// CHARGE MODEL: destination only. Direct mode is disabled.
// If STRIPE_USE_DIRECT_CHARGES=true, getChargeModel() throws and we return 503.
// See lib/stripe-charge-model.ts for rationale.
// ============================================================

import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { getChargeModel, DirectChargeNotSupportedError } from "@/lib/stripe-charge-model";
import {
  getListingQuoteResult,
  CHECKOUT_BLOCKED_PLATFORM_FEE_CODE,
  CHECKOUT_BLOCKED_PLATFORM_FEE_MESSAGE,
} from "@/lib/pricing";
import { TAX_CLASSIFICATION_PENDING_CODE, TAX_CLASSIFICATION_BLOCKED_MESSAGE } from "@/lib/tax";
import { calculateDestinationChargeAmounts } from "@/lib/destination-charge";
import { getTaxClassification, calculateGst } from "@/lib/tax";
import {
  releaseListingReservationIfActive,
  expireListingReservationIfActive,
  RESERVATION_STATUS,
  releaseExpiredReservationsForListingIds,
} from "@/lib/listing-reservation";
import { CHECKOUT_RESERVATION_MINUTES } from "@/lib/checkout-ttl";
import { unitPriceExGstFromPackPrice } from "@/lib/listing-units";
import { activeAcceptedListingNegotiationWhere } from "@/lib/listing-negotiation-hold";
import Stripe from "stripe";
import {
  isStripeConnectAccountNotFoundError,
  SELLER_STRIPE_ACCOUNT_INVALID_MESSAGE,
  stripeDestinationErrorResponse,
} from "@/lib/stripe-account-errors";

const LISTING_RESERVATION_EXPIRY_MINUTES = CHECKOUT_RESERVATION_MINUTES;
/** Align with reservation window so retries stay on the same PaymentIntent bucket. */
const LISTING_IDEMPOTENCY_BUCKET_MS = CHECKOUT_RESERVATION_MINUTES * 60 * 1000;

const EXPIRED_CHECKOUT_MESSAGE = "This checkout session has expired; please start a new checkout." as const;

/** Params that must match for strict idempotent reuse (listing flow). */
type ListingReuseParams = {
  totalChargedCents: number;
  quantity: number;
  deliveryFeeExGstCents: number;
  taxClassification: string;
  negotiatedPriceSource: "LISTING" | "NEGOTIATION";
  listingNegotiationId: string | null;
};

/**
 * Idempotency key includes full checkout fingerprint so changing delivery, negotiated price,
 * or tax does not collide with a previous attempt (avoids 409 mismatch errors).
 */
function deriveListingIdempotencyKey(
  buyerId: string,
  listingId: string,
  p: ListingReuseParams
): string {
  const base = `${buyerId}:${listingId}:${p.quantity}:${p.totalChargedCents}:${p.deliveryFeeExGstCents}:${p.taxClassification}:${p.negotiatedPriceSource}:${p.listingNegotiationId ?? ""}`;
  const hash = createHash("sha256").update(base).digest("hex").slice(0, 24);
  const bucket = Math.floor(Date.now() / LISTING_IDEMPOTENCY_BUCKET_MS);
  return `listing-${hash}-${bucket}`;
}

function listingParamsMatchAttempt(
  attempt: {
    totalChargedCents: number;
    quantity: number;
    deliveryFeeExGstCents: number;
    taxClassification: string | null;
    negotiatedPriceSource: string | null;
    listingNegotiationId: string | null;
  },
  current: ListingReuseParams
): boolean {
  return (
    attempt.totalChargedCents === current.totalChargedCents &&
    attempt.quantity === current.quantity &&
    attempt.deliveryFeeExGstCents === current.deliveryFeeExGstCents &&
    (attempt.taxClassification ?? "") === current.taxClassification &&
    (attempt.negotiatedPriceSource ?? "") === current.negotiatedPriceSource &&
    (attempt.listingNegotiationId ?? "") === (current.listingNegotiationId ?? "")
  );
}

/**
 * Derive idempotency key for wanted-offer flow server-side so the same (buyer, offer, quantity)
 * cannot create duplicate PaymentIntents on retries or double-clicks. Same bucket window as listing.
 */
function deriveWantedOfferIdempotencyKey(buyerId: string, wantedOfferId: string, quantity: number): string {
  const base = `${buyerId}:${wantedOfferId}:${quantity}`;
  const hash = createHash("sha256").update(base).digest("hex").slice(0, 24);
  const bucket = Math.floor(Date.now() / LISTING_IDEMPOTENCY_BUCKET_MS);
  return `wanted-${hash}-${bucket}`;
}

/** Params that must match for strict idempotent reuse (wanted-offer flow). */
type WantedReuseParams = {
  totalChargedCents: number;
  quantity: number;
  deliveryFeeExGstCents: number;
  taxClassification: string;
};

type ExistingAttempt = {
  id: string;
  reservationStatus: string;
  stripePaymentIntentId: string | null;
  expiresAt: Date;
  totalChargedCents: number;
  quantity: number;
  deliveryFeeExGstCents: number;
  taxClassification: string | null;
  negotiatedPriceSource: string | null;
  listingNegotiationId: string | null;
};

/** Statuses that mean the wanted-offer attempt is still in progress and reusable (return existing client secret). */
const WANTED_OFFER_REUSABLE_STATUS = "PAYMENT_INTENT_CREATED";

/** Statuses that mean the attempt is terminal; do not reuse, return restart-checkout. */
const WANTED_OFFER_TERMINAL_STATUSES = new Set(["FAILED", "CANCELED", "PAID", "EXPIRED"]);

type ExistingWantedOfferAttempt = {
  id: string;
  status: string;
  stripePaymentIntentId: string | null;
  expiresAt: Date;
  totalChargedCents: number;
  quantity: number;
  deliveryFeeExGstCents: number;
  taxClassification: string | null;
};

const IDEMPOTENCY_MISMATCH_MESSAGE =
  "Idempotency key was reused with different payment parameters (amount, quantity, delivery, tax, or price source). Use a new key or match the original request." as const;

/**
 * Wanted-offer flow: idempotency keyed by offer + qty; mismatch returns 409.
 */
function checkStrictReuseWanted(
  attempt: ExistingWantedOfferAttempt,
  current: WantedReuseParams
): NextResponse | null {
  if (
    attempt.totalChargedCents !== current.totalChargedCents ||
    attempt.quantity !== current.quantity ||
    attempt.deliveryFeeExGstCents !== current.deliveryFeeExGstCents ||
    (attempt.taxClassification ?? "") !== current.taxClassification
  ) {
    return NextResponse.json({ message: IDEMPOTENCY_MISMATCH_MESSAGE }, { status: 409 });
  }
  return null;
}

/**
 * Resolve an existing wanted-offer PaymentAttempt into the response to return.
 * State-aware: only reuses when status is PAYMENT_INTENT_CREATED, has PI, and not expired.
 * Returns null if there is no attempt (caller should proceed with create).
 */
async function resolveExistingWantedOfferAttempt(
  attempt: ExistingWantedOfferAttempt | null,
  stripeClient: Stripe
): Promise<NextResponse | null> {
  if (!attempt) return null;

  const now = new Date();
  const isExpired = attempt.expiresAt < now;

  // Reuse only when in-progress, has PI, and not expired.
  if (
    attempt.status === WANTED_OFFER_REUSABLE_STATUS &&
    attempt.stripePaymentIntentId &&
    !isExpired
  ) {
    const pi = await stripeClient.paymentIntents.retrieve(attempt.stripePaymentIntentId);
    return NextResponse.json({ clientSecret: pi.client_secret });
  }

  // In-progress: attempt exists but PI not yet set (concurrent create).
  if (
    !attempt.stripePaymentIntentId &&
    !isExpired &&
    !WANTED_OFFER_TERMINAL_STATUSES.has(attempt.status)
  ) {
    return NextResponse.json(
      { message: "Payment intent is being created; please retry in a moment." },
      { status: 409 }
    );
  }

  // Terminal or expired: do not reuse; require new checkout.
  // Align with attempt lifecycle: durably mark expired attempts as EXPIRED before returning.
  if (isExpired && !WANTED_OFFER_TERMINAL_STATUSES.has(attempt.status)) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" },
    });
  }
  return NextResponse.json({ message: EXPIRED_CHECKOUT_MESSAGE }, { status: 400 });
}

/** Result of resolving an existing listing attempt: return a response, allow a new attempt, or proceed with create (null). */
type ResolveListingResult = NextResponse | { allowNewAttempt: true } | null;

/**
 * Resolve an existing listing PaymentAttempt into the response to return.
 * Mirrors the same logic for both the main existing-attempt branch and the P2002 retry branch.
 * Returns null if there is no attempt (caller should proceed with create).
 * Returns { allowNewAttempt: true } when attempt is expired/terminal so caller can create a fresh attempt with a new key.
 */
async function resolveExistingListingAttempt(
  attempt: ExistingAttempt | null,
  stripeClient: Stripe
): Promise<ResolveListingResult> {
  if (!attempt) return null;

  const now = new Date();
  const isExpired = attempt.expiresAt < now;

  if (
    attempt.reservationStatus === RESERVATION_STATUS.ACTIVE &&
    attempt.stripePaymentIntentId &&
    !isExpired
  ) {
    const pi = await stripeClient.paymentIntents.retrieve(attempt.stripePaymentIntentId);
    return NextResponse.json({ clientSecret: pi.client_secret });
  }

  if (attempt.reservationStatus === RESERVATION_STATUS.ACTIVE && isExpired) {
    await prisma.$transaction((tx) =>
      expireListingReservationIfActive(tx, { paymentAttemptId: attempt.id })
    );
    return { allowNewAttempt: true };
  }

  if (
    attempt.reservationStatus === RESERVATION_STATUS.ACTIVE &&
    !attempt.stripePaymentIntentId &&
    !isExpired
  ) {
    return NextResponse.json(
      { message: "Payment intent is being created; please retry in a moment." },
      { status: 409 }
    );
  }

  return { allowNewAttempt: true };
}

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
    const { listingId, quantity, deliveryFee: deliveryFeeOverride, wantedOfferId } = body as {
      listingId?: string;
      quantity?: number;
      deliveryFee?: number;
      wantedOfferId?: string;
      idempotencyKey?: string;
    };
    // Listing and wanted-offer flows both use server-derived idempotency keys (see deriveListingIdempotencyKey / deriveWantedOfferIdempotencyKey).

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
      // Runtime account health check — prevent checkout if seller account is restricted
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
      const deliveryFeeExGST =
        typeof deliveryFeeOverride === "number" && deliveryFeeOverride >= 0 ? deliveryFeeOverride : 0;
      const taxResult = getTaxClassification({ isGstFreeOverride: null });
      if (taxResult.checkoutBlocked) {
        return NextResponse.json(
          { code: TAX_CLASSIFICATION_PENDING_CODE, message: TAX_CLASSIFICATION_BLOCKED_MESSAGE },
          { status: 403 }
        );
      }
      const grossAmount =
        offer.pricePerUnit != null && offer.pricePerUnit > 0
          ? offer.pricePerUnit * offer.quantity
          : offer.pricePerPack * offer.quantity;
      const subtotalExGST = grossAmount + deliveryFeeExGST;
      const gstAmount = calculateGst(subtotalExGST, taxResult);
      const totalCharged = subtotalExGST + gstAmount;
      const platformFee = calculatePlatformFee(grossAmount);
      const netToSeller = grossAmount - platformFee + deliveryFeeExGST;
      const wantedTotalChargedCents = Math.round(totalCharged * 100);
      const wantedPlatformFeeCents = Math.round(platformFee * 100);
      const wantedNetToSellerCents = Math.round(netToSeller * 100);
      if (wantedPlatformFeeCents > wantedTotalChargedCents || wantedNetToSellerCents < 0) {
        return NextResponse.json(
          { code: CHECKOUT_BLOCKED_PLATFORM_FEE_CODE, message: CHECKOUT_BLOCKED_PLATFORM_FEE_MESSAGE },
          { status: 400 }
        );
      }
      const destAmounts = calculateDestinationChargeAmounts({
        totalChargedCents: wantedTotalChargedCents,
        platformFeeCents: wantedPlatformFeeCents,
        gstAmountCents: Math.round(gstAmount * 100),
        netToSellerCents: wantedNetToSellerCents,
      });
      getChargeModel(); // Throws if STRIPE_USE_DIRECT_CHARGES=true; only destination is supported.

      const grossAmountCents = Math.round(grossAmount * 100);
      const deliveryFeeExGstCents = Math.round(deliveryFeeExGST * 100);
      const platformFeeCents = Math.round(platformFee * 100);
      const gstAmountCents = Math.round(gstAmount * 100);
      const netToSellerCents = Math.round(netToSeller * 100);
      const totalChargedCents = destAmounts.buyerTotalCents;
      const expiresAt = new Date(Date.now() + LISTING_RESERVATION_EXPIRY_MINUTES * 60 * 1000);
      const idempotencyScopeWanted = `wanted:${offer.id}`;
      const stripeIdempotencyKey = deriveWantedOfferIdempotencyKey(buyerId, offer.id, offer.quantity);
      const wantedReuseParams: WantedReuseParams = {
        totalChargedCents,
        quantity: offer.quantity,
        deliveryFeeExGstCents,
        taxClassification: taxResult.classification,
      };

      // Idempotency: resolve existing wanted-offer attempt (scoped by buyer + scope + key; strict reuse on params).
      const existingWantedAttempt = await prisma.paymentAttempt.findUnique({
        where: {
          buyerId_idempotencyScope_idempotencyKey: {
            buyerId,
            idempotencyScope: idempotencyScopeWanted,
            idempotencyKey: stripeIdempotencyKey,
          },
        },
        select: {
          id: true,
          status: true,
          stripePaymentIntentId: true,
          expiresAt: true,
          totalChargedCents: true,
          quantity: true,
          deliveryFeeExGstCents: true,
          taxClassification: true,
        },
      });
      if (existingWantedAttempt) {
        const mismatch = checkStrictReuseWanted(existingWantedAttempt, wantedReuseParams);
        if (mismatch) return mismatch;
      }
      const resolvedWanted = await resolveExistingWantedOfferAttempt(existingWantedAttempt, stripe);
      if (resolvedWanted) return resolvedWanted;

      try {
        const attempt = await prisma.paymentAttempt.create({
          data: {
            idempotencyKey: stripeIdempotencyKey,
            idempotencyScope: idempotencyScopeWanted,
            buyerId,
            sellerId: offer.sellerId,
            wantedOfferId: offer.id,
            quantity: offer.quantity,
            deliveryFeeExGstCents,
            grossAmountCents,
            platformFeeCents,
            gstAmountCents,
            totalChargedCents,
            netToSellerCents,
            chargeModel: destAmounts.chargeModel,
            status: "QUOTED",
            reservationStatus: "N/A", // wanted-offer has no listing-style reservation lifecycle
            expiresAt,
            taxClassification: taxResult.classification,
          },
        });

        // DESTINATION CHARGE: application_fee_amount = platform fee only (see lib/destination-charge.ts).
        const piParams: Stripe.PaymentIntentCreateParams = {
          amount: destAmounts.buyerTotalCents,
          currency: "aud",
          application_fee_amount: destAmounts.applicationFeeAmountCents,
          transfer_data: {
            destination: offer.seller.stripeAccountId,
          },
          metadata: {
            chargeModel: destAmounts.chargeModel,
            wantedOfferId: offer.id,
            buyerId,
            sellerId: offer.sellerId,
            quantity: String(offer.quantity),
            unitPrice: String(
              offer.pricePerUnit != null && offer.pricePerUnit > 0
                ? offer.pricePerUnit
                : offer.pricePerPack
            ),
            grossAmount: String(grossAmount),
            deliveryFee: String(deliveryFeeExGST),
            platformFee: String(platformFee),
            gstAmount: String(gstAmount),
            netToSeller: String(netToSeller),
            transferToSeller: String(destAmounts.transferToSellerCents / 100),
            taxClassification: taxResult.classification,
          },
        };

        const paymentIntent = await stripe.paymentIntents.create(piParams, {
          idempotencyKey: stripeIdempotencyKey,
        });

        await prisma.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            stripePaymentIntentId: paymentIntent.id,
            status: "PAYMENT_INTENT_CREATED",
          },
        });

        return NextResponse.json({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (e: unknown) {
        const isPrismaUnique = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002";
        if (isPrismaUnique) {
          const retryWantedAttempt = await prisma.paymentAttempt.findUnique({
            where: {
              buyerId_idempotencyScope_idempotencyKey: {
                buyerId,
                idempotencyScope: idempotencyScopeWanted,
                idempotencyKey: stripeIdempotencyKey,
              },
            },
            select: {
              id: true,
              status: true,
              stripePaymentIntentId: true,
              expiresAt: true,
              totalChargedCents: true,
              quantity: true,
              deliveryFeeExGstCents: true,
              taxClassification: true,
            },
          });
          if (retryWantedAttempt) {
            const mismatch = checkStrictReuseWanted(retryWantedAttempt, wantedReuseParams);
            if (mismatch) return mismatch;
          }
          const retryResolved = await resolveExistingWantedOfferAttempt(retryWantedAttempt, stripe);
          if (retryResolved) return retryResolved;
        }
        throw e;
      }
    }

    if (!listingId || !quantity || quantity < 1 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { message: "listingId and a whole-number unit quantity are required" },
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
    await releaseExpiredReservationsForListingIds([listingId]);
    const sellerStripeAccountId = listing.pharmacy.stripeAccountId;
    // Runtime account health check — prevent checkout if seller account is restricted
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

    // Use agreed negotiated price if seller accepted a buyer offer
    const acceptedNegotiation = await prisma.listingNegotiation.findFirst({
      where: {
        listingId,
        buyerId,
        ...activeAcceptedListingNegotiationWhere(),
      },
      orderBy: { updatedAt: "desc" },
    });
    const pricePerPackListed =
      acceptedNegotiation?.proposedPricePerPack ?? listing.pricePerPack;
    const unitPriceExGst = unitPriceExGstFromPackPrice(
      pricePerPackListed,
      listing.packSize
    );

    const listingDeliveryFee = (listing as { deliveryFee?: number }).deliveryFee ?? 0;
    const deliveryFeeExGST =
      typeof deliveryFeeOverride === "number" && deliveryFeeOverride >= 0
        ? deliveryFeeOverride
        : listingDeliveryFee;
    const quoteResult = getListingQuoteResult({
      unitPriceExGst,
      quantity,
      deliveryFeeExGst: deliveryFeeExGST,
      isGstFree: listing.isGstFree ?? null,
    });
    if (!quoteResult.allowed) {
      const status =
        quoteResult.code === "TAX_CLASSIFICATION_PENDING"
          ? 403
          : quoteResult.code === CHECKOUT_BLOCKED_PLATFORM_FEE_CODE
            ? 400
            : 400;
      return NextResponse.json({ code: quoteResult.code, message: quoteResult.reason }, { status });
    }
    const quote = quoteResult.quote;
    const {
      totalChargedCents,
      gstAmountCents,
      platformFeeCents,
      grossAmountCents,
      deliveryFeeExGstCents,
      netToSellerCents,
      gstAmount,
      platformFee,
      grossAmount,
      deliveryFeeExGst,
      netToSeller,
      taxClassification,
    } = quote;
    const destAmounts = calculateDestinationChargeAmounts({
      totalChargedCents,
      platformFeeCents,
      gstAmountCents,
      netToSellerCents,
    });
    const amountInCents = destAmounts.buyerTotalCents;
    const expiresAt = new Date(Date.now() + LISTING_RESERVATION_EXPIRY_MINUTES * 60 * 1000);
    const negotiatedPriceSource: "LISTING" | "NEGOTIATION" = acceptedNegotiation ? "NEGOTIATION" : "LISTING";
    const listingNegotiationId = acceptedNegotiation?.id ?? null;
    const listingReuseParams: ListingReuseParams = {
      totalChargedCents: amountInCents,
      quantity,
      deliveryFeeExGstCents: quote.deliveryFeeExGstCents,
      taxClassification,
      negotiatedPriceSource,
      listingNegotiationId,
    };

    getChargeModel(); // Throws if STRIPE_USE_DIRECT_CHARGES=true; only destination is supported.

    let listingIdempotencyKey = deriveListingIdempotencyKey(
      buyerId,
      listingId,
      listingReuseParams
    );

    const listingAttemptSelect = {
      id: true,
      reservationStatus: true,
      stripePaymentIntentId: true,
      status: true,
      expiresAt: true,
      totalChargedCents: true,
      quantity: true,
      deliveryFeeExGstCents: true,
      taxClassification: true,
      negotiatedPriceSource: true,
      listingNegotiationId: true,
    } as const;

    const activeListingAttempts = await prisma.paymentAttempt.findMany({
      where: {
        buyerId,
        listingId,
        reservationStatus: RESERVATION_STATUS.ACTIVE,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: listingAttemptSelect,
    });

    const paramsMatchingAttempts = activeListingAttempts.filter((a) =>
      listingParamsMatchAttempt(a, listingReuseParams)
    );
    const reuseListingAttempt = paramsMatchingAttempts[0] ?? null;

    await prisma.$transaction(async (tx) => {
      for (const a of activeListingAttempts) {
        if (!reuseListingAttempt || a.id !== reuseListingAttempt.id) {
          await expireListingReservationIfActive(tx, { paymentAttemptId: a.id });
        }
      }
    });

    if (reuseListingAttempt) {
      const refreshed = await prisma.paymentAttempt.findUnique({
        where: { id: reuseListingAttempt.id },
        select: listingAttemptSelect,
      });
      if (
        refreshed &&
        refreshed.reservationStatus === RESERVATION_STATUS.ACTIVE &&
        refreshed.expiresAt > new Date()
      ) {
        const resolved = await resolveExistingListingAttempt(refreshed, stripe);
        if (resolved instanceof NextResponse) return resolved;
      }
    }

    const keyOccupant = await prisma.paymentAttempt.findUnique({
      where: {
        buyerId_idempotencyScope_idempotencyKey: {
          buyerId,
          idempotencyScope: listingId,
          idempotencyKey: listingIdempotencyKey,
        },
      },
      select: { reservationStatus: true },
    });
    if (keyOccupant && keyOccupant.reservationStatus !== RESERVATION_STATUS.ACTIVE) {
      listingIdempotencyKey = `${listingIdempotencyKey}-n-${Date.now()}`;
    }

    const heldByBuyerSelect = listingAttemptSelect;

    let createdAttemptId: string;
    try {
      createdAttemptId = await prisma.$transaction(async (tx) => {
        const fresh = await tx.listing.findUnique({ where: { id: listingId } });
        const available = (fresh?.quantityUnits ?? 0) - (fresh?.reservedUnits ?? 0);
        if (!fresh || available < quantity) {
          throw new Error("INSUFFICIENT_QUANTITY");
        }
        const attempt = await tx.paymentAttempt.create({
          data: {
            idempotencyKey: listingIdempotencyKey,
            idempotencyScope: listingId,
            buyerId,
            sellerId: listing.pharmacyId,
            listingId,
            quantity,
            deliveryFeeExGstCents,
            grossAmountCents,
            platformFeeCents,
            gstAmountCents,
            totalChargedCents: amountInCents,
            netToSellerCents,
            chargeModel: destAmounts.chargeModel,
            status: "QUOTED",
            reservationStatus: RESERVATION_STATUS.ACTIVE,
            expiresAt,
            taxClassification: taxClassification,
            negotiatedPriceSource,
            listingNegotiationId,
          },
        });
        await tx.listing.update({
          where: { id: listingId },
          data: { reservedUnits: { increment: quantity } },
        });
        return attempt.id;
      });
    } catch (e: unknown) {
      const isPrismaUnique = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002";
      if (isPrismaUnique) {
        const retryAttempt = await prisma.paymentAttempt.findUnique({
          where: {
            buyerId_idempotencyScope_idempotencyKey: {
              buyerId,
              idempotencyScope: listingId,
              idempotencyKey: listingIdempotencyKey,
            },
          },
          select: {
            id: true,
            reservationStatus: true,
            stripePaymentIntentId: true,
            expiresAt: true,
            totalChargedCents: true,
            quantity: true,
            deliveryFeeExGstCents: true,
            taxClassification: true,
            negotiatedPriceSource: true,
            listingNegotiationId: true,
          },
        });
        if (
          retryAttempt &&
          listingParamsMatchAttempt(retryAttempt, listingReuseParams)
        ) {
          const retryResolved = await resolveExistingListingAttempt(
            retryAttempt,
            stripe
          );
          if (retryResolved instanceof NextResponse) return retryResolved;
        }
      }
      if (e instanceof Error && e.message === "INSUFFICIENT_QUANTITY") {
        const heldCandidates = await prisma.paymentAttempt.findMany({
          where: {
            buyerId,
            listingId,
            quantity,
            reservationStatus: RESERVATION_STATUS.ACTIVE,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
          select: heldByBuyerSelect,
        });
        const held = heldCandidates.find((h) =>
          listingParamsMatchAttempt(h, listingReuseParams)
        );
        if (held) {
          const hr = await resolveExistingListingAttempt(held, stripe);
          if (hr instanceof NextResponse) return hr;
        }
        return NextResponse.json(
          {
            message:
              "Not available at this quantity — the seller does not have enough units in stock. Choose a lower quantity.",
          },
          { status: 400 }
        );
      }
      throw e;
    }

    try {
      const piParams: Stripe.PaymentIntentCreateParams = {
        amount: amountInCents,
        currency: "aud",
        application_fee_amount: destAmounts.applicationFeeAmountCents,
        transfer_data: {
          destination: listing.pharmacy.stripeAccountId,
        },
        metadata: {
          chargeModel: destAmounts.chargeModel,
          listingId,
          buyerId,
          sellerId: listing.pharmacyId,
          quantity: String(quantity),
          reservedUnits: String(quantity),
          unitPrice: String(unitPriceExGst),
          grossAmount: String(grossAmount),
          deliveryFee: String(deliveryFeeExGst),
          platformFee: String(platformFee),
          gstAmount: String(gstAmount),
          netToSeller: String(netToSeller),
          transferToSeller: String(destAmounts.transferToSellerCents / 100),
          reservedAt: new Date().toISOString(),
          taxClassification,
        },
      };

      const paymentIntent = await stripe.paymentIntents.create(piParams, {
        idempotencyKey: listingIdempotencyKey,
      });

      await prisma.paymentAttempt.update({
        where: { id: createdAttemptId },
        data: {
          stripePaymentIntentId: paymentIntent.id,
          status: "PAYMENT_INTENT_CREATED",
        },
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (stripeError) {
      await prisma.$transaction((tx) =>
        releaseListingReservationIfActive(tx, { paymentAttemptId: createdAttemptId })
      );
      throw stripeError;
    }
  } catch (e) {
    if (e instanceof DirectChargeNotSupportedError) {
      return NextResponse.json(
        { message: e.message },
        { status: 503 }
      );
    }
    const dest = stripeDestinationErrorResponse(e);
    if (dest) {
      return NextResponse.json(dest, { status: 400 });
    }
    console.error("[create-payment-intent]", e);
    let message = "Failed to create payment intent";
    if (e instanceof Error) {
      message = e.message;
    } else if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
      message = (e as { message: string }).message;
    }
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
