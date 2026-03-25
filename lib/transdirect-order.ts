import { prisma } from "@/lib/prisma";
import {
  createTransdirectBooking,
  getTransdirectTracking,
  normalizeTransdirectError,
  type TransdirectBookingInput,
  type TransdirectBookingResult,
} from "@/lib/transdirect";
import {
  mergeOrderShippingMeta,
  parseOrderShippingMeta,
  hasTransdirectBookedArtifacts,
  normalizeTransdirectShipmentState,
  normalizeTransdirectTrackingStatus,
  shipmentStateFromTrackingStatus,
} from "@/lib/order-shipping";

const DEFAULT_WEIGHT_KG = Number(process.env.TRANSDIRECT_DEFAULT_WEIGHT_KG || 1);
const DEFAULT_LENGTH_CM = Number(process.env.TRANSDIRECT_DEFAULT_LENGTH_CM || 22);
const DEFAULT_WIDTH_CM = Number(process.env.TRANSDIRECT_DEFAULT_WIDTH_CM || 16);
const DEFAULT_HEIGHT_CM = Number(process.env.TRANSDIRECT_DEFAULT_HEIGHT_CM || 7);
const BOOKING_IN_PROGRESS_TIMEOUT_MS = Number(process.env.TRANSDIRECT_BOOKING_IN_PROGRESS_TIMEOUT_MS || 15 * 60 * 1000);

function orderRef(orderId: string) {
  return `GX-${orderId.slice(-5).toUpperCase()}`;
}

function parseMetaBasics(sellerNotes: string | null) {
  const meta = parseOrderShippingMeta(sellerNotes);
  return {
    selectedPrice: meta.transdirect?.selectedPrice,
    selectedServiceName: meta.transdirect?.selectedServiceName,
    selectedCourierName: meta.transdirect?.selectedCourierName,
    quoteReference: meta.transdirect?.quoteReference,
    pickupDate: meta.transdirect?.pickupDate,
    bookingStartedAt: meta.transdirect?.bookingStartedAt,
  };
}

function hasBookedArtifacts(meta: ReturnType<typeof parseOrderShippingMeta>["transdirect"] | undefined): boolean {
  return hasTransdirectBookedArtifacts(meta);
}

function buildReconciliation(input: {
  selectedPrice?: number;
  selectedServiceName?: string;
  selectedCourierName?: string;
  quoteReference?: string;
  booking: TransdirectBookingResult;
}) {
  const selectedService = (input.selectedServiceName || "").trim().toLowerCase();
  const selectedCourier = (input.selectedCourierName || "").trim().toLowerCase();
  const bookedService = (input.booking.bookedServiceName || "").trim().toLowerCase();
  const bookedCourier = (input.booking.bookedCourierName || "").trim().toLowerCase();
  const selectedPrice = Number(input.selectedPrice);
  const providerAmount = Number(input.booking.providerAmount);
  const hasSelectedPrice = Number.isFinite(selectedPrice);
  const hasProviderAmount = Number.isFinite(providerAmount);
  const providerAmountMismatch = hasSelectedPrice && hasProviderAmount
    ? Math.abs(selectedPrice - providerAmount) > 0.009
    : false;
  const selectedVsBookedServiceMismatch = Boolean(selectedService && bookedService && selectedService !== bookedService);
  const selectedVsBookedCourierMismatch = Boolean(selectedCourier && bookedCourier && selectedCourier !== bookedCourier);
  return {
    selectedSnapshot: {
      serviceName: input.selectedServiceName,
      courierName: input.selectedCourierName,
      quoteReference: input.quoteReference,
      price: hasSelectedPrice ? selectedPrice : undefined,
    },
    bookedSnapshot: {
      serviceName: input.booking.bookedServiceName,
      courierName: input.booking.bookedCourierName,
      bookingReference: input.booking.bookingReference,
      consignmentNumber: input.booking.consignmentNumber,
      trackingNumber: input.booking.trackingNumber,
      providerAmount: hasProviderAmount ? providerAmount : undefined,
      bookingStatus: input.booking.status,
    },
    reconciliation: {
      quotedBookedMismatch: selectedVsBookedServiceMismatch || selectedVsBookedCourierMismatch || providerAmountMismatch,
      selectedVsBookedServiceMismatch,
      selectedVsBookedCourierMismatch,
      providerAmountMismatch,
    },
  };
}

export async function bookTransdirectForOrder(orderId: string): Promise<{
  ok: boolean;
  booking?: TransdirectBookingResult;
  message?: string;
  code?:
    | "ORDER_NOT_FOUND"
    | "ORDER_NOT_PAID"
    | "PROVIDER_NOT_TRANSDIRECT"
    | "STATE_NOT_READY"
    | "PICKUP_DATE_REQUIRED"
    | "PICKUP_DATE_INVALID"
    | "PICKUP_DATE_OUTSIDE_WINDOW"
    | "ALREADY_BOOKED"
    | "BOOKING_IN_PROGRESS"
    | "BOOKED"
    | "BOOKING_FAILED";
  alreadyBooked?: boolean;
}> {
  const prep = await prisma.$transaction(async (tx) => {
    // Postgres advisory lock to prevent concurrent duplicate booking attempts for same order.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`td-book-${orderId}`}))`;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: true,
        seller: true,
      },
    });
    if (!order) return { ok: false, message: "Order not found.", code: "ORDER_NOT_FOUND" as const };
    if (order.status !== "PAID") {
      return { ok: false, message: "Order is not in a bookable paid state.", code: "ORDER_NOT_PAID" as const };
    }

    const meta = parseOrderShippingMeta(order.sellerNotes);
    const provider = meta.transdirect?.provider ?? (meta.transdirect ? "transdirect" : undefined);
    if (provider !== "transdirect") {
      return {
        ok: false,
        message: "Shipping provider is not Transdirect for this order.",
        code: "PROVIDER_NOT_TRANSDIRECT" as const,
      };
    }

    if (hasBookedArtifacts(meta.transdirect)) {
      return {
        ok: true,
        message: "Shipment already booked.",
        code: "ALREADY_BOOKED" as const,
        alreadyBooked: true as const,
      };
    }

    const selected = parseMetaBasics(order.sellerNotes);
    const pickupDate = (selected.pickupDate || "").trim();
    if (!pickupDate) {
      return {
        ok: false,
        message: "Pickup/shipping date is required before booking courier.",
        code: "PICKUP_DATE_REQUIRED" as const,
      };
    }
    const pickupMs = new Date(pickupDate).getTime();
    if (!Number.isFinite(pickupMs)) {
      return { ok: false, message: "Pickup/shipping date is invalid.", code: "PICKUP_DATE_INVALID" as const };
    }
    const created = new Date(order.createdAt).getTime();
    const deadline = created + 3 * 24 * 60 * 60 * 1000;
    if (pickupMs > deadline) {
      return {
        ok: false,
        message: "Pickup/shipping date must be within 3 days of purchase.",
        code: "PICKUP_DATE_OUTSIDE_WINDOW" as const,
      };
    }

    const state = normalizeTransdirectShipmentState(meta.transdirect);
    if (state === "booking_in_progress") {
      const startedAtMs = new Date(selected.bookingStartedAt || "").getTime();
      const stale = Number.isFinite(startedAtMs) && Date.now() - startedAtMs > BOOKING_IN_PROGRESS_TIMEOUT_MS;
      if (!stale) {
        return {
          ok: true,
          message: "Booking is already in progress.",
          code: "BOOKING_IN_PROGRESS" as const,
        };
      }
      // Safe recovery for stale in-progress state (crash/timeout between start and final persist).
      await tx.order.update({
        where: { id: order.id },
        data: {
          sellerNotes: mergeOrderShippingMeta(order.sellerNotes, {
            transdirect: {
              provider: "transdirect",
              bookingStatus: "ready_to_book",
              shipmentState: "ready_to_book",
              bookingStartedAt: undefined,
              bookingRecoveredAt: new Date().toISOString(),
              bookingRecoveryCount: (meta.transdirect?.bookingRecoveryCount ?? 0) + 1,
              attention: {
                ...(meta.transdirect?.attention ?? {}),
                staleRecovery: true,
                note: "Recovered stale booking_in_progress state.",
                updatedAt: new Date().toISOString(),
              },
            },
          }),
        },
      });
    } else if (state !== "ready_to_book") {
      return {
        ok: false,
        message: "Shipment is not approval-ready for booking.",
        code: "STATE_NOT_READY" as const,
      };
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        sellerNotes: mergeOrderShippingMeta(order.sellerNotes, {
          transdirect: {
            provider: "transdirect",
            bookingStatus: "booking_in_progress",
            shipmentState: "booking_in_progress",
            bookingStartedAt: new Date().toISOString(),
            lastBookingAttemptAt: new Date().toISOString(),
          },
        }),
      },
    });

    return {
      ok: true,
      order,
      selected,
      pickupDate,
    };
  });

  if (!prep.ok) return prep;
  if ("alreadyBooked" in prep && prep.alreadyBooked) return prep;
  const order = prep.order;
  const selected = prep.selected;
  const pickupDate = prep.pickupDate;
  const payload: TransdirectBookingInput = {
    orderReference: orderRef(order.id),
    sender: {
      name: order.seller.name,
      email: order.seller.email ?? undefined,
      phone: order.seller.phone ?? order.seller.mobile ?? undefined,
      addressLine1: order.seller.address,
      suburb: order.seller.suburb,
      state: String(order.seller.state),
      postcode: order.seller.postcode,
    },
    receiver: {
      name: order.buyer.name,
      email: order.buyer.email ?? undefined,
      phone: order.buyer.phone ?? order.buyer.mobile ?? undefined,
      addressLine1: order.buyer.address,
      suburb: order.buyer.suburb,
      state: String(order.buyer.state),
      postcode: order.buyer.postcode,
    },
    parcels: [
      {
        weightKg: DEFAULT_WEIGHT_KG,
        lengthCm: DEFAULT_LENGTH_CM,
        widthCm: DEFAULT_WIDTH_CM,
        heightCm: DEFAULT_HEIGHT_CM,
      },
    ],
    selectedQuoteReference: selected.quoteReference,
    selectedServiceName: selected.selectedServiceName,
    selectedCourierName: selected.selectedCourierName,
    pickupDate,
  };

  try {
    const booking = await createTransdirectBooking(payload);
    const reconciled = buildReconciliation({
      selectedPrice: selected.selectedPrice,
      selectedServiceName: selected.selectedServiceName,
      selectedCourierName: selected.selectedCourierName,
      quoteReference: selected.quoteReference,
      booking,
    });
    const needsAttention = Boolean(
      reconciled.reconciliation.quotedBookedMismatch
    );
    await prisma.order.update({
      where: { id: order.id },
      data: {
        courierName: booking.provider === "transdirect"
          ? [selected.selectedCourierName, selected.selectedServiceName].filter(Boolean).join(" - ") || "Transdirect"
          : order.courierName,
        trackingNumber: booking.trackingNumber ?? booking.consignmentNumber ?? order.trackingNumber,
        sellerNotes: mergeOrderShippingMeta(order.sellerNotes, {
          transdirect: {
            provider: "transdirect",
            bookingReference: booking.bookingReference,
            consignmentNumber: booking.consignmentNumber,
            trackingNumber: booking.trackingNumber,
            labelUrl: booking.labelUrl,
            bookingStatus: booking.status,
            shipmentState: "booked",
            bookingStartedAt: undefined,
            rawBooking: booking.raw,
            selectedSnapshot: reconciled.selectedSnapshot,
            bookedSnapshot: reconciled.bookedSnapshot,
            reconciliation: reconciled.reconciliation,
            needsAttention,
            lastError: undefined,
            attention: needsAttention
              ? {
                  bookingFailure: false,
                  trackingFailure: false,
                  deliveryException: false,
                  staleRecovery: false,
                  note: "Quoted vs booked shipment mismatch detected.",
                  lastCode: "TRANSDIRECT_RECON_MISMATCH",
                  lastMessage: "Selected shipping option differs from booked shipment details.",
                  updatedAt: new Date().toISOString(),
                }
              : {
                  bookingFailure: false,
                  trackingFailure: false,
                  deliveryException: false,
                  staleRecovery: false,
                  updatedAt: new Date().toISOString(),
                },
          },
        }),
      },
    });
    return { ok: true, booking, code: "BOOKED" };
  } catch (error) {
    const normalized = normalizeTransdirectError(error);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        sellerNotes: mergeOrderShippingMeta(order.sellerNotes, {
          transdirect: {
            provider: "transdirect",
            bookingStatus: "booking_failed",
            shipmentState: "failed",
            bookingStartedAt: undefined,
            needsAttention: true,
            lastError: normalized.message,
            attention: {
              bookingFailure: true,
              trackingFailure: false,
              deliveryException: false,
              staleRecovery: false,
              lastCode: normalized.code,
              lastMessage: normalized.message,
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      },
    });
    return { ok: false, message: normalized.message, code: "BOOKING_FAILED" };
  }
}

export async function refreshTransdirectTrackingForOrder(orderId: string): Promise<{
  ok: boolean;
  status?: string;
  message?: string;
}> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, message: "Order not found." };
  const meta = parseOrderShippingMeta(order.sellerNotes);
  let tracking;
  try {
    tracking = await getTransdirectTracking({
      bookingReference: meta.transdirect?.bookingReference,
      consignmentNumber: meta.transdirect?.consignmentNumber,
      trackingNumber: order.trackingNumber ?? meta.transdirect?.trackingNumber,
    });
  } catch (err) {
    const normalized = normalizeTransdirectError(err);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        sellerNotes: mergeOrderShippingMeta(order.sellerNotes, {
          transdirect: {
            provider: "transdirect",
            needsAttention: true,
            attention: {
              ...(meta.transdirect?.attention ?? {}),
              trackingFailure: true,
              lastCode: normalized.code,
              lastMessage: normalized.message,
              updatedAt: new Date().toISOString(),
            },
            lastError: normalized.message,
            lastTrackingRefreshAt: new Date().toISOString(),
          },
        }),
      },
    });
    return { ok: false, message: "Tracking lookup failed." };
  }
  if (!tracking.status) {
    return { ok: false, message: "Tracking lookup failed." };
  }
  const normalizedTrackingStatus = normalizeTransdirectTrackingStatus(tracking.statusRaw ?? tracking.status);
  const mappedState = shipmentStateFromTrackingStatus(normalizedTrackingStatus);
  const priorState = normalizeTransdirectShipmentState(meta.transdirect);
  const isUnknownTracking = !mappedState || normalizedTrackingStatus === "unknown";
  const state = mappedState ?? priorState ?? "exception";
  const isExceptionLike = state === "exception" || state === "returned" || state === "cancelled";
  const needsAttention = isExceptionLike || isUnknownTracking;
  await prisma.order.update({
    where: { id: order.id },
    data: {
      sellerNotes: mergeOrderShippingMeta(order.sellerNotes, {
        transdirect: {
          provider: "transdirect",
          lastTrackingStatus: normalizedTrackingStatus,
          lastTrackingStatusRaw: tracking.statusRaw ?? tracking.status,
          lastTrackingRefreshAt: new Date().toISOString(),
          shipmentState: state,
          rawTracking: tracking.raw,
          needsAttention,
          attention: {
            ...(meta.transdirect?.attention ?? {}),
            trackingFailure: false,
            deliveryException: isExceptionLike,
            note: isUnknownTracking
              ? "Tracking status is unknown/unrecognized; prior shipment state preserved."
              : undefined,
            lastCode: isExceptionLike
              ? "TRANSDIRECT_EXCEPTION_STATE"
              : isUnknownTracking
                ? "TRANSDIRECT_UNKNOWN_TRACKING_STATUS"
                : undefined,
            lastMessage: isExceptionLike
              ? `Tracking indicates ${normalizedTrackingStatus}.`
              : isUnknownTracking
                ? `Unrecognized tracking status: ${normalizedTrackingStatus}.`
                : undefined,
            updatedAt: new Date().toISOString(),
          },
        },
      }),
    },
  });
  return { ok: true, status: normalizedTrackingStatus };
}
