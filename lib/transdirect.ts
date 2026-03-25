type BuildingType = "commercial" | "residential";

export type TransdirectParcelInput = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type TransdirectQuoteInput = {
  senderPostcode: string;
  senderSuburb?: string;
  senderState?: string;
  senderBuildingType: BuildingType;
  receiverPostcode: string;
  receiverSuburb?: string;
  receiverState?: string;
  receiverBuildingType: BuildingType;
  parcels: TransdirectParcelInput[];
  authorityToLeave?: boolean;
  transitWarranty?: boolean;
  pickupDate?: string;
  reference?: string;
};

export type TransdirectQuoteOption = {
  provider: "transdirect";
  serviceName: string;
  courierName?: string;
  totalPrice: number;
  currency: "AUD";
  etaText?: string;
  quoteReference?: string;
  raw?: unknown;
};

export type TransdirectBookingInput = {
  orderReference: string;
  sender: {
    name: string;
    email?: string;
    phone?: string;
    addressLine1: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  receiver: {
    name: string;
    email?: string;
    phone?: string;
    addressLine1: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  parcels: TransdirectParcelInput[];
  selectedQuoteReference?: string;
  selectedServiceName?: string;
  selectedCourierName?: string;
  authorityToLeave?: boolean;
  transitWarranty?: boolean;
  pickupDate?: string;
};

export type TransdirectBookingResult = {
  provider: "transdirect";
  bookingReference: string;
  consignmentNumber?: string;
  trackingNumber?: string;
  labelUrl?: string;
  status: string;
  bookedServiceName?: string;
  bookedCourierName?: string;
  providerAmount?: number;
  raw?: unknown;
};

export type TransdirectTrackingResult = {
  provider: "transdirect";
  status: string;
  statusRaw?: string;
  events?: Array<{
    timestamp?: string;
    status: string;
    location?: string;
    description?: string;
  }>;
  raw?: unknown;
};

type EndpointKind = "quote" | "booking" | "tracking";

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_BASE_URL = "https://www.transdirect.com.au/api";

function getBaseUrl(): string {
  const base = process.env.TRANSDIRECT_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  if (!base) throw new Error("Transdirect base URL not configured.");
  return base.replace(/\/+$/, "");
}

function withTimeout(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return controller.signal;
}

function authHeaders(): HeadersInit {
  const apiKey = process.env.TRANSDIRECT_API_KEY?.trim();
  const username = process.env.TRANSDIRECT_API_USERNAME?.trim();
  const password = process.env.TRANSDIRECT_API_PASSWORD?.trim();
  const headers: Record<string, string> = {};
  if (apiKey) headers["Api-key"] = apiKey;
  if (username && password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }
  if (!apiKey && !(username && password)) {
    throw new Error("Transdirect credentials not configured.");
  }
  return headers;
}

function usingApiKeyMode(): boolean {
  return Boolean(process.env.TRANSDIRECT_API_KEY?.trim());
}

function endpointPath(kind: EndpointKind, trackingId?: string): string {
  const quoteOverride = process.env.TRANSDIRECT_QUOTE_PATH?.trim();
  const bookingOverride = process.env.TRANSDIRECT_BOOKING_PATH?.trim();
  const trackingOverride = process.env.TRANSDIRECT_TRACKING_PATH?.trim();
  if (kind === "tracking" && trackingId) {
    return trackingOverride || `/bookings/track/v4/${trackingId}`;
  }
  if (kind === "quote") {
    if (quoteOverride) return quoteOverride;
    return usingApiKeyMode() ? "/bookings/v4" : "/bookings";
  }
  if (kind === "booking") {
    if (bookingOverride) return bookingOverride;
    return usingApiKeyMode() ? "/bookings/v4" : "/bookings";
  }
  return "/bookings";
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function sanitizeLogPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  const blacklist = ["password", "api_key", "apiKey", "token", "authorization"];
  for (const k of Object.keys(clone)) {
    if (blacklist.includes(k)) clone[k] = "***";
  }
  return clone;
}

async function transdirectRequest<T>(args: {
  kind: EndpointKind;
  method?: "GET" | "POST";
  body?: unknown;
  trackingId?: string;
  rawText?: boolean;
  pathOverride?: string;
}): Promise<T> {
  const baseUrl = getBaseUrl();
  const timeoutMs = Number(process.env.TRANSDIRECT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const method = args.method ?? "POST";
  const path = (args.pathOverride || endpointPath(args.kind, args.trackingId)).trim();
  const url = `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers: HeadersInit = {
    Accept: "application/json",
    ...authHeaders(),
  };
  if (method !== "GET") {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  console.info(`[Transdirect] ${args.kind} request`, sanitizeLogPayload(args.body));
  const res = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : JSON.stringify(args.body ?? {}),
    signal: withTimeout(timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS),
  });
  const text = await res.text();
  const data = args.rawText ? (text as T) : ((text ? JSON.parse(text) : {}) as T);
  console.info(`[Transdirect] ${args.kind} response`, {
    ok: res.ok,
    status: res.status,
    body: sanitizeLogPayload(args.rawText ? { textLength: text.length } : data),
  });
  if (!res.ok) {
    const msg = typeof data === "object" && data ? JSON.stringify(data) : text || res.statusText;
    const err = new Error(`Transdirect ${args.kind} failed (${res.status}): ${msg}`) as Error & {
      status?: number;
      responseBody?: unknown;
    };
    err.status = res.status;
    err.responseBody = data;
    throw err;
  }
  return data;
}

export function normalizeTransdirectError(error: unknown): { message: string; code: string } {
  const raw = error instanceof Error ? error.message : String(error || "Unknown error");
  if (raw.toLowerCase().includes("timeout") || raw.toLowerCase().includes("abort")) {
    return { message: "Shipping provider timed out. Please retry.", code: "TRANSDIRECT_TIMEOUT" };
  }
  if (raw.toLowerCase().includes("credentials") || raw.toLowerCase().includes("configured")) {
    return { message: "Shipping provider is not configured.", code: "TRANSDIRECT_CONFIG" };
  }
  return { message: "Shipping provider error. Please try again.", code: "TRANSDIRECT_ERROR" };
}

type TransdirectLocation = {
  locality: string;
  postcode: string;
  state: string;
};

function normalizeLocalityText(value: string): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

async function resolveLocationForPostcode(args: {
  postcode: string;
  preferredSuburb?: string;
  preferredState?: string;
}): Promise<TransdirectLocation | null> {
  const pc = String(args.postcode || "").replace(/\D/g, "").slice(0, 4);
  if (pc.length !== 4) return null;
  const data = await transdirectRequest<{ locations?: Array<Record<string, unknown>> }>({
    kind: "quote",
    method: "GET",
    pathOverride: `/locations/postcode/${pc}`,
  });
  const rows = Array.isArray(data.locations) ? data.locations : [];
  if (rows.length === 0) return null;
  const preferredLoc = normalizeLocalityText(args.preferredSuburb || "");
  const preferredState = normalizeLocalityText(args.preferredState || "");
  const parsed: TransdirectLocation[] = rows
    .map((r) => {
      const locality = typeof r.locality === "string" ? r.locality : "";
      const postcode = typeof r.postcode === "string" ? r.postcode : String(r.postcode ?? "");
      const state = typeof r.state === "string" ? r.state : String(r.state ?? "");
      if (!locality || !postcode || !state) return null;
      return {
        locality: normalizeLocalityText(locality),
        postcode: String(postcode).replace(/\D/g, "").slice(0, 4),
        state: normalizeLocalityText(state),
      };
    })
    .filter((x): x is TransdirectLocation => Boolean(x));

  if (preferredLoc) {
    const exact = parsed.find(
      (p) => p.locality === normalizeLocalityText(preferredLoc) && (!preferredState || p.state === preferredState)
    );
    if (exact) return exact;
    const contains = parsed.find(
      (p) => p.locality.includes(preferredLoc) && (!preferredState || p.state === preferredState)
    );
    if (contains) return contains;
  }
  if (preferredState) {
    const stateMatch = parsed.find((p) => p.state === preferredState);
    if (stateMatch) return stateMatch;
  }
  return parsed[0] ?? null;
}

export async function getTransdirectQuote(input: TransdirectQuoteInput): Promise<TransdirectQuoteOption[]> {
  const senderResolved = await resolveLocationForPostcode({
    postcode: input.senderPostcode,
    preferredSuburb: input.senderSuburb,
    preferredState: input.senderState,
  });
  const receiverResolved = await resolveLocationForPostcode({
    postcode: input.receiverPostcode,
    preferredSuburb: input.receiverSuburb,
    preferredState: input.receiverState,
  });

  const senderSuburb = senderResolved?.locality ?? normalizeLocalityText(input.senderSuburb || "");
  const senderState = senderResolved?.state ?? normalizeLocalityText(input.senderState || "");
  const receiverSuburb = receiverResolved?.locality ?? normalizeLocalityText(input.receiverSuburb || "");
  const receiverState = receiverResolved?.state ?? normalizeLocalityText(input.receiverState || "");

  const basePayload = {
    declared_value: "0.00",
    items: input.parcels.map((p) => ({
      weight: String(p.weightKg),
      height: String(p.heightCm),
      width: String(p.widthCm),
      length: String(p.lengthCm),
      quantity: 1,
      description: "carton",
    })),
    sender: {
      postcode: input.senderPostcode,
      suburb: senderSuburb,
      state: senderState,
      type: input.senderBuildingType === "commercial" ? "business" : "residential",
      country: "AU",
    },
    receiver: {
      postcode: input.receiverPostcode,
      suburb: receiverSuburb,
      state: receiverState,
      type: input.receiverBuildingType === "commercial" ? "business" : "residential",
      country: "AU",
    },
  };
  let response: Record<string, unknown>;
  try {
    response = await transdirectRequest<Record<string, unknown>>({
      kind: "quote",
      method: "POST",
      body: basePayload,
    });
  } catch (error) {
    const err = error as Error & { status?: number; responseBody?: unknown };
    const shouldRetryMinimal = err.status === 400;
    if (!shouldRetryMinimal) throw error;
    // If suburb/state was rejected, retry using resolved suburbs only (and blank state if needed).
    const minimalPayload = {
      ...basePayload,
      sender: {
        ...basePayload.sender,
        suburb: senderResolved?.locality ?? basePayload.sender.suburb,
        state: senderResolved?.state ?? "",
      },
      receiver: {
        ...basePayload.receiver,
        suburb: receiverResolved?.locality ?? basePayload.receiver.suburb,
        state: receiverResolved?.state ?? "",
      },
    };
    response = await transdirectRequest<Record<string, unknown>>({
      kind: "quote",
      method: "POST",
      body: minimalPayload,
    });
  }

  const quotesObj =
    (response.quotes && typeof response.quotes === "object" ? response.quotes : null) as
      | Record<string, unknown>
      | null;
  if (!quotesObj) return [];
  const mapped = Object.entries(quotesObj).map(([courierKey, value]): TransdirectQuoteOption | null => {
      if (!value || typeof value !== "object") return null;
      const obj = value as Record<string, unknown>;
      const totalPrice = toNumber(obj.total) ?? toNumber(obj.price_insurance_ex);
      if (totalPrice == null) return null;
      return {
        provider: "transdirect" as const,
        serviceName: pickString(obj, ["service"]) ?? courierKey,
        courierName: courierKey,
        totalPrice,
        currency: "AUD" as const,
        etaText: pickString(obj, ["transit_time"]),
        quoteReference: pickString(response, ["id"]),
        raw: obj,
      };
    });
  return mapped.filter((x): x is TransdirectQuoteOption => x !== null);
}

export async function createTransdirectBooking(
  input: TransdirectBookingInput
): Promise<TransdirectBookingResult> {
  const payload = {
    declared_value: "0.00",
    referrer: "API",
    requesting_site: "https://www.galaxrx.com.au",
    tailgate_pickup: false,
    tailgate_delivery: false,
    items: input.parcels.map((p) => ({
        weight: p.weightKg,
        height: p.heightCm,
        width: p.widthCm,
        length: p.lengthCm,
        quantity: 1,
        description: "carton",
      })),
    sender: {
      address: input.sender.addressLine1,
      company_name: "",
      email: input.sender.email ?? "",
      name: input.sender.name,
      postcode: input.sender.postcode,
      phone: input.sender.phone ?? "",
      state: input.sender.state,
      suburb: input.sender.suburb,
      type: "business",
      country: "AU",
    },
    receiver: {
      address: input.receiver.addressLine1,
      company_name: "",
      email: input.receiver.email ?? "",
      name: input.receiver.name,
      postcode: input.receiver.postcode,
      phone: input.receiver.phone ?? "",
      state: input.receiver.state,
      suburb: input.receiver.suburb,
      type: "business",
      country: "AU",
    },
  };
  const data = await transdirectRequest<Record<string, unknown>>({
    kind: "booking",
    method: "POST",
    body: payload,
  });
  const bookingReference =
    pickString(data, ["id", "bookingReference", "booking_reference", "job_id"]) ?? "";
  if (!bookingReference) {
    throw new Error("Transdirect booking did not return a booking reference.");
  }

  // Optional confirm step if caller selected a courier/pickup date.
  const selectedCourier = (input.selectedCourierName || "").trim();
  const pickupDate = (input.pickupDate || "").trim();
  if (selectedCourier && pickupDate) {
    const confirmPath =
      process.env.TRANSDIRECT_CONFIRM_PATH?.trim() || `/bookings/v4/${bookingReference}/confirm`;
    const baseUrl = getBaseUrl();
    await fetch(`${baseUrl}${confirmPath.startsWith("/") ? "" : "/"}${confirmPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ courier: selectedCourier, "pickup-date": pickupDate }),
      signal: withTimeout(Number(process.env.TRANSDIRECT_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)),
    }).catch(() => {
      // Do not fail booking if confirm call fails; booking remains created.
    });
  }

  const labelPath = `/bookings/v4/${bookingReference}/label`;
  const labelUrl = `${getBaseUrl()}${labelPath}`;
  return {
    provider: "transdirect",
    bookingReference,
    consignmentNumber: pickString(data, ["connote", "consignment", "consignment_number"]),
    trackingNumber: pickString(data, ["connote", "tracking", "tracking_number"]),
    labelUrl: pickString(data, ["label"]) ?? labelUrl,
    status: pickString(data, ["status"]) ?? "booked",
    bookedServiceName: pickString(data, ["service", "service_name"]) ?? input.selectedServiceName,
    bookedCourierName: pickString(data, ["courier", "carrier", "courier_name"]) ?? input.selectedCourierName,
    providerAmount: toNumber((data as Record<string, unknown>).total) ?? toNumber((data as Record<string, unknown>).amount),
    raw: data,
  };
}

export async function getTransdirectTracking(input: {
  bookingReference?: string;
  consignmentNumber?: string;
  trackingNumber?: string;
}): Promise<TransdirectTrackingResult> {
  const bookingId =
    (input.bookingReference || input.trackingNumber || input.consignmentNumber || "").trim();
  if (!bookingId) throw new Error("Tracking requires booking or consignment reference.");
  const html = await transdirectRequest<string>({
    kind: "tracking",
    method: "GET",
    trackingId: bookingId,
    rawText: true,
  });
  const lower = html.toLowerCase();
  const statusRaw =
    lower.includes("out for delivery")
      ? "out for delivery"
      : lower.includes("return to sender") || lower.includes("returned")
        ? "returned"
        : lower.includes("cancel")
          ? "cancelled"
          : lower.includes("delivery exception") || lower.includes("unable to deliver") || lower.includes("failed")
            ? "exception"
            : lower.includes("delivered")
              ? "delivered"
              : lower.includes("in transit")
                ? "in transit"
                : lower.includes("picked up")
                  ? "picked up"
                  : lower.includes("confirmed")
                    ? "confirmed"
                    : "unknown";
  const status =
    statusRaw === "out for delivery"
      ? "out_for_delivery"
      : statusRaw === "returned"
        ? "returned"
        : statusRaw === "cancelled"
          ? "cancelled"
          : statusRaw === "exception"
            ? "exception"
            : statusRaw === "delivered"
              ? "delivered"
              : statusRaw === "in transit"
                ? "in_transit"
                : statusRaw === "picked up"
                  ? "picked_up"
                  : statusRaw === "confirmed"
                    ? "confirmed"
                    : "unknown";
  return {
    provider: "transdirect",
    status,
    statusRaw,
    events: [],
    raw: { html },
  };
}
