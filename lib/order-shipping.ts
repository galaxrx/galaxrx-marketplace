export type StoredShippingMeta = {
  shippingArrangement?: "platform" | "direct_contact";
  transdirect?: {
    provider?: "transdirect";
    shipmentState?:
      | "awaiting_seller_approval"
      | "ready_to_book"
      | "booking_in_progress"
      | "booked"
      | "in_transit"
      | "out_for_delivery"
      | "delivered"
      | "cancelled"
      | "returned"
      | "exception"
      | "failed";
    selectedPrice?: number;
    selectedServiceName?: string;
    selectedCourierName?: string;
    quoteReference?: string;
    pickupDate?: string;
    bookingStartedAt?: string;
    bookingReference?: string;
    consignmentNumber?: string;
    trackingNumber?: string;
    labelUrl?: string;
    bookingStatus?: string;
    lastTrackingStatus?: string;
    rawQuote?: unknown;
    rawBooking?: unknown;
    rawTracking?: unknown;
    needsAttention?: boolean;
    lastError?: string;
    bookingRecoveredAt?: string;
    bookingRecoveryCount?: number;
    lastBookingAttemptAt?: string;
    lastTrackingRefreshAt?: string;
    lastTrackingStatusRaw?: string;
    selectedSnapshot?: {
      serviceName?: string;
      courierName?: string;
      quoteReference?: string;
      price?: number;
    };
    bookedSnapshot?: {
      serviceName?: string;
      courierName?: string;
      bookingReference?: string;
      consignmentNumber?: string;
      trackingNumber?: string;
      providerAmount?: number;
      bookingStatus?: string;
    };
    reconciliation?: {
      quotedBookedMismatch?: boolean;
      selectedVsBookedServiceMismatch?: boolean;
      selectedVsBookedCourierMismatch?: boolean;
      providerAmountMismatch?: boolean;
    };
    attention?: {
      bookingFailure?: boolean;
      trackingFailure?: boolean;
      deliveryException?: boolean;
      staleRecovery?: boolean;
      note?: string;
      lastCode?: string;
      lastMessage?: string;
      updatedAt?: string;
    };
  };
  legacySellerNotes?: string;
};

const BOOKING_IN_PROGRESS_TIMEOUT_MS = Number(
  process.env.TRANSDIRECT_BOOKING_IN_PROGRESS_TIMEOUT_MS || 15 * 60 * 1000
);

export function parseOrderShippingMeta(sellerNotes: string | null | undefined): StoredShippingMeta {
  if (!sellerNotes?.trim()) return {};
  try {
    const parsed = JSON.parse(sellerNotes) as StoredShippingMeta;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    return { legacySellerNotes: sellerNotes };
  }
  return {};
}

function isValidShipmentState(value: unknown): value is NonNullable<StoredShippingMeta["transdirect"]>["shipmentState"] {
  return (
    value === "awaiting_seller_approval" ||
    value === "ready_to_book" ||
    value === "booking_in_progress" ||
    value === "booked" ||
    value === "in_transit" ||
    value === "out_for_delivery" ||
    value === "delivered" ||
    value === "cancelled" ||
    value === "returned" ||
    value === "exception" ||
    value === "failed"
  );
}

function toLower(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function configuredTransdirectApiHostname(): string {
  try {
    return process.env.TRANSDIRECT_API_BASE_URL ? new URL(process.env.TRANSDIRECT_API_BASE_URL).hostname : "";
  } catch {
    return "";
  }
}

const TRANSDIRECT_ALLOWED_DOCUMENT_HOSTS = new Set(
  ["www.transdirect.com.au", "transdirect.com.au", configuredTransdirectApiHostname()]
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
);

export function parseTrustedShipmentDocumentUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (!TRANSDIRECT_ALLOWED_DOCUMENT_HOSTS.has(url.hostname.toLowerCase())) return null;
    const path = url.pathname.toLowerCase();
    if (!/^\/api\/bookings\/v\d+\/[^/]+\/label\/?$/.test(path) && !/^\/bookings\/v\d+\/[^/]+\/label\/?$/.test(path)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function isTrustedShipmentDocumentUrl(raw: string): boolean {
  return parseTrustedShipmentDocumentUrl(raw) !== null;
}

export function hasTransdirectBookedArtifacts(meta: StoredShippingMeta["transdirect"] | undefined): boolean {
  if (!meta) return false;
  const state = normalizeTransdirectShipmentState(meta);
  if (
    state === "booked" ||
    state === "in_transit" ||
    state === "out_for_delivery" ||
    state === "delivered" ||
    state === "cancelled" ||
    state === "returned" ||
    state === "exception"
  ) {
    return true;
  }
  return Boolean(
    meta.bookingReference ||
      meta.consignmentNumber ||
      meta.trackingNumber ||
      meta.labelUrl
  );
}

export function normalizeTransdirectTrackingStatus(rawStatus: unknown): string {
  const status = toLower(rawStatus);
  if (!status) return "unknown";
  if (status.includes("deliver") && status.includes("out for")) return "out_for_delivery";
  if (status.includes("out_for_delivery")) return "out_for_delivery";
  if (status.includes("delivered")) return "delivered";
  if (status.includes("return") || status.includes("rts") || status.includes("return_to_sender")) return "returned";
  if (status.includes("cancel")) return "cancelled";
  if (
    status.includes("failed") ||
    status.includes("exception") ||
    status.includes("unable") ||
    status.includes("undeliver") ||
    status.includes("attempted")
  ) {
    return "exception";
  }
  if (status.includes("in transit") || status.includes("in_transit")) return "in_transit";
  if (status.includes("picked")) return "picked_up";
  if (status.includes("confirm") || status.includes("booked")) return "confirmed";
  return status.replace(/\s+/g, "_");
}

export function shipmentStateFromTrackingStatus(
  status: unknown
): NonNullable<StoredShippingMeta["transdirect"]>["shipmentState"] | null {
  const normalized = normalizeTransdirectTrackingStatus(status);
  if (normalized === "delivered") return "delivered";
  if (normalized === "out_for_delivery") return "out_for_delivery";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "returned") return "returned";
  if (normalized === "exception") return "exception";
  if (normalized === "in_transit" || normalized === "picked_up") return "in_transit";
  if (normalized === "confirmed") return "booked";
  return null;
}

export function normalizeTransdirectShipmentState(
  meta: StoredShippingMeta["transdirect"] | undefined
): NonNullable<StoredShippingMeta["transdirect"]>["shipmentState"] | null {
  if (!meta) return null;
  if (isValidShipmentState(meta.shipmentState)) return meta.shipmentState;

  const bookingStatus = toLower(meta.bookingStatus);
  const trackingState = shipmentStateFromTrackingStatus(meta.lastTrackingStatusRaw ?? meta.lastTrackingStatus);

  if (hasTransdirectBookedArtifacts(meta)) {
    const trackingStatus = toLower(meta.lastTrackingStatusRaw ?? meta.lastTrackingStatus);
    if (trackingStatus && trackingState) return trackingState;
    return "booked";
  }
  if (bookingStatus === "booking_in_progress") {
    const startedAtMs = new Date(String(meta.bookingStartedAt ?? "")).getTime();
    const isFresh = Number.isFinite(startedAtMs) && Date.now() - startedAtMs <= BOOKING_IN_PROGRESS_TIMEOUT_MS;
    if (isFresh) return "booking_in_progress";
  }
  if (
    meta.needsAttention ||
    bookingStatus === "booking_failed" ||
    bookingStatus === "failed" ||
    meta.attention?.bookingFailure ||
    meta.attention?.trackingFailure ||
    meta.attention?.deliveryException
  ) {
    return "failed";
  }
  const hasBookabilitySignals = Boolean(
    meta.pickupDate && (meta.quoteReference || (meta.selectedCourierName && meta.selectedServiceName))
  );
  if (bookingStatus === "ready_to_book" && hasBookabilitySignals) return "ready_to_book";
  if (hasBookabilitySignals && !bookingStatus) return "ready_to_book";
  return "awaiting_seller_approval";
}

export function mergeOrderShippingMeta(
  sellerNotes: string | null | undefined,
  patch: Partial<StoredShippingMeta>
): string {
  const current = parseOrderShippingMeta(sellerNotes);
  const merged: StoredShippingMeta = {
    ...current,
    ...patch,
    transdirect: {
      ...(current.transdirect ?? {}),
      ...(patch.transdirect ?? {}),
    },
  };
  if (merged.transdirect) {
    merged.transdirect.shipmentState = normalizeTransdirectShipmentState(merged.transdirect) ?? undefined;
  }
  return JSON.stringify(merged);
}
