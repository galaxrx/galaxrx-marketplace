/**
 * Register of Pharmacies API client.
 * NSW Register uses api.onegov.nsw.gov.au: first get OAuth token, then call Verify with Bearer.
 * Auth: API Key + API Secret (or AUTH_HEADER) used to get access_token from OAuth endpoint.
 */

const NSW_ONEgov = {
  tokenUrl: "https://api.onegov.nsw.gov.au/oauth/client_credential/accesstoken",
  verifyUrl: "https://api.onegov.nsw.gov.au/pharmacyregister/v1/verify",
};

// Simple in-memory cache for OAuth token (avoid requesting on every verify). Token lasts ~12h.
let cachedToken: { token: string; expiresAt: number } | null = null;

function getBasicAuth(): string | null {
  const authHeader = process.env.REGISTER_OF_PHARMACIES_AUTH_HEADER?.trim();
  if (authHeader) return authHeader.startsWith("Basic ") ? authHeader : `Basic ${authHeader}`;
  const apiKey = process.env.REGISTER_OF_PHARMACIES_API_KEY?.trim();
  const apiSecret = process.env.REGISTER_OF_PHARMACIES_API_SECRET?.trim();
  if (apiKey && apiSecret) {
    return "Basic " + Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString("base64");
  }
  return null;
}

function getConfig(): { baseUrl: string; authHeader: string } | null {
  const baseUrl = process.env.REGISTER_OF_PHARMACIES_API_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return null;
  const authHeader = getBasicAuth();
  if (!authHeader) return null;
  return { baseUrl, authHeader };
}

/** Get OAuth access token from NSW OneGov (for api.nsw.gov.au / api.onegov.nsw.gov.au). */
async function getNswAccessToken(authHeader: string): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(`${NSW_ONEgov.tokenUrl}?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[Register of Pharmacies] OAuth token failed:", res.status, text);
    return null;
  }
  const data = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  const token = data?.access_token;
  if (!token) {
    console.error("[Register of Pharmacies] OAuth response missing access_token");
    return null;
  }
  const expiresIn = (data?.expires_in ?? 12 * 3600) * 1000;
  cachedToken = { token, expiresAt: Date.now() + expiresIn };
  return token;
}

export type VerifyPharmacyResult =
  | { ok: true; pharmacy?: { name?: string; address?: string; suburb?: string; state?: string; postcode?: string; abn?: string; approvalNumber?: string } }
  | { ok: false; message: string };

type MappedPharmacyDetails = NonNullable<Extract<VerifyPharmacyResult, { ok: true }>["pharmacy"]>;

/**
 * Verify a pharmacy by its registration/approval code against the Register of Pharmacies API.
 * Returns verification result and optional details for pre-filling the registration form.
 */
export async function verifyPharmacyByCode(code: string): Promise<VerifyPharmacyResult> {
  const config = getConfig();
  if (!config) {
    return {
      ok: false,
      message: "Register of Pharmacies API is not configured. Please contact support.",
    };
  }
  const { baseUrl, authHeader } = config;

  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return { ok: false, message: "Pharmacy code is required." };
  }

  // NSW Register of Pharmacies: api.nsw.gov.au portal uses api.onegov.nsw.gov.au behind the scenes.
  // Flow: get OAuth token from OneGov, then GET pharmacyregister/v1/verify with Bearer token.
  // Data.NSW CKAN: only when explicitly set (RESOURCE_ID + full data.nsw.gov.au VERIFY_PATH).
  const verifyPath = process.env.REGISTER_OF_PHARMACIES_VERIFY_PATH?.trim();
  const resourceId = process.env.REGISTER_OF_PHARMACIES_RESOURCE_ID?.trim();
  const isCkan =
    !!resourceId &&
    !!verifyPath &&
    verifyPath.startsWith("http") &&
    verifyPath.includes("data.nsw.gov.au");

  const useNswOneGov = !isCkan && (baseUrl.includes("api.nsw.gov.au") || baseUrl.includes("onegov.nsw.gov.au"));

  try {
    let url: string;
    let method: "GET" | "POST" = "GET";
    let body: string | undefined;
    let authHeaderToUse = authHeader;

    if (isCkan) {
      url = verifyPath!;
      method = "POST";
      body = JSON.stringify({
        resource_id: resourceId,
        q: trimmedCode,
        limit: 1,
      });
    } else if (useNswOneGov) {
      // NSW OneGov: get Bearer token, then call Verify endpoint
      const token = await getNswAccessToken(authHeader);
      if (!token) {
        return { ok: false, message: "Verification service is temporarily unavailable. Please try again later." };
      }
      const paramName = process.env.REGISTER_OF_PHARMACIES_CODE_PARAM || "licenceNumber";
      const verifyBase = verifyPath && verifyPath.startsWith("http")
        ? verifyPath.replace(/\?.*$/, "")
        : NSW_ONEgov.verifyUrl;
      const urlObj = new URL(verifyBase);
      urlObj.searchParams.set(paramName, trimmedCode);
      url = urlObj.toString();
      authHeaderToUse = `Bearer ${token}`;
    } else {
      const path =
        verifyPath && !verifyPath.startsWith("http")
          ? verifyPath.replace(/^\//, "")
          : "pharmacies/search";
      const paramName = process.env.REGISTER_OF_PHARMACIES_CODE_PARAM || "registrationNumber";
      const base = baseUrl.replace(/\/$/, "");
      const pathNorm = path.startsWith("http") ? path : `${base}/${path}`;
      const urlObj = new URL(pathNorm);
      urlObj.searchParams.set(paramName, trimmedCode);
      url = urlObj.toString();
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: authHeaderToUse,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(useNswOneGov && process.env.REGISTER_OF_PHARMACIES_API_KEY
          ? { apikey: process.env.REGISTER_OF_PHARMACIES_API_KEY }
          : {}),
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      if (res.status === 404) {
        return { ok: false, message: "Pharmacy not found with this registration code." };
      }
      if (res.status === 401 || res.status === 403) {
        console.error("[Register of Pharmacies API] Auth failed:", res.status);
        return { ok: false, message: "Verification service is temporarily unavailable." };
      }
      const text = await res.text();
      console.error("[Register of Pharmacies API] Error:", res.status, text);
      return { ok: false, message: "Could not verify pharmacy. Please check the code and try again." };
    }

    const data = (await res.json().catch(() => null)) as unknown;
    if (!data || (typeof data !== "object" && !Array.isArray(data))) {
      return { ok: false, message: "Invalid response from verification service." };
    }

    // CKAN returns { success, result: { records: [...] } }; API NSW may use different shape
    const record = isCkan
      ? extractCkanRecord(data as Record<string, unknown>)
      : extractPharmacyRecord(data as Record<string, unknown> | unknown[]);
    if (!record) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Register of Pharmacies API] 200 but no record. Response keys:", Object.keys(data as object));
      }
      return { ok: false, message: "Pharmacy not found with this registration code." };
    }

    return {
      ok: true,
      pharmacy: mapToPharmacyDetails(record),
    };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError" || err.message?.includes("timeout")) {
        return { ok: false, message: "Verification timed out. Please try again." };
      }
      console.error("[Register of Pharmacies API]", err);
    }
    return { ok: false, message: "Verification failed. Please try again later." };
  }
}

/** CKAN datastore_search: { success, result: { records: [...] } } */
function extractCkanRecord(data: Record<string, unknown>): Record<string, unknown> | null {
  const result = data.result as Record<string, unknown> | undefined;
  const records = result?.records as unknown[] | undefined;
  if (Array.isArray(records) && records.length > 0) {
    const first = records[0];
    return first && typeof first === "object" && first !== null ? (first as Record<string, unknown>) : null;
  }
  return null;
}

function extractPharmacyRecord(data: Record<string, unknown> | unknown[]): Record<string, unknown> | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object" && first !== null ? (first as Record<string, unknown>) : null;
  }
  if (typeof data !== "object") return null;
  // API NSW / common: result or result.Results, or data, results, records, list
  const result = data.result as Record<string, unknown> | unknown[] | undefined;
  const arr = (Array.isArray(result)
    ? result
    : (result && typeof result === "object" && "Results" in result
        ? (result as Record<string, unknown>).Results
        : null) ??
    data.data ??
    data.results ??
    data.Results ??
    data.records ??
    data.pharmacies ??
    data.list) as unknown[] | undefined;
  if (Array.isArray(arr) && arr.length > 0) {
    const first = arr[0];
    return first && typeof first === "object" && first !== null ? (first as Record<string, unknown>) : null;
  }
  // Single object response
  if (
    "name" in data ||
    "pharmacyName" in data ||
    "approvalNumber" in data ||
    "registrationNumber" in data ||
    "RegistrationNumber" in data ||
    "licenceNumber" in data
  ) {
    return data;
  }
  return null;
}

/** Parse Australian-style "Number StreetName Suburb STATE 1234" so street keeps number + street name. */
function parseAustralianAddress(full: string): { street: string; suburb?: string; state?: string; postcode?: string } {
  const trimmed = full.trim();
  if (!trimmed) return { street: trimmed };
  const statePostcode = trimmed.match(/\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})$/i);
  if (statePostcode) {
    const state = statePostcode[1].toUpperCase();
    const postcode = statePostcode[2];
    const before = trimmed.slice(0, trimmed.length - statePostcode[0].length).trim();
    const suburbMatch = before.match(/\s+([A-Za-z.\-]+(?:\s+[A-Za-z.\-]+)?)\s*$/);
    const suburb = suburbMatch ? suburbMatch[1].trim() : undefined;
    const street = suburbMatch ? before.slice(0, before.length - suburbMatch[0].length).trim() : before;
    return { street: street || trimmed, suburb, state, postcode };
  }
  return { street: trimmed };
}

function mapToPharmacyDetails(record: Record<string, unknown>): MappedPharmacyDetails {
  const getStr = (...keys: string[]) => {
    for (const k of keys) {
      const v = record[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
  };
  const rawAddress = getStr("address", "streetAddress", "addressLine1", "Address", "Street address");
  const suburb = getStr("suburb", "locality", "suburbName", "Suburb");
  const state = getStr("state", "State");
  const postcode = getStr("postcode", "postCode", "Postcode", "Post code");
  const parsed = rawAddress ? parseAustralianAddress(rawAddress) : null;
  const s = suburb ?? parsed?.suburb;
  const st = state ?? parsed?.state;
  const pc = postcode ?? parsed?.postcode;
  const streetPart = parsed?.street ?? rawAddress;
  const fullAddress =
    rawAddress && (s || st || pc)
      ? [streetPart, [s, st, pc].filter(Boolean).join(" ")].filter(Boolean).join(", ")
      : (rawAddress ?? (streetPart ? [streetPart, [s, st, pc].filter(Boolean).join(" ")].filter(Boolean).join(", ") : undefined));
  return {
    name: getStr("name", "pharmacyName", "tradingName", "businessName", "organisationName", "licenceHolderName", "Pharmacy name", "Trading name"),
    address: fullAddress ?? undefined,
    suburb: s,
    state: st,
    postcode: pc,
    abn: getStr("abn", "ABN"),
    approvalNumber: getStr(
      "approvalNumber",
      "registrationNumber",
      "licenceNumber",
      "code",
      "approval_number",
      "Registration number",
      "Approval number"
    ),
  } as MappedPharmacyDetails;
}
