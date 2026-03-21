/**
 * Australia Post Postage Assessment Calculator (PAC) API.
 * Domestic parcel services and price calculation.
 * Docs: https://developers.auspost.com.au/apis/pac
 */

const AUSPOST_BASE = "https://digitalapi.auspost.com.au";
const AUTH_HEADER = "AUTH-KEY";

export type AusPostParcelRate = {
  code: string;
  name: string;
  price: number; // AUD, ex GST (Australia Post prices are typically inc GST; we store as number for display)
};

type DomesticServiceEntry = {
  code?: string;
  name?: string;
  price?: number;
  total_cost?: number;
  [key: string]: unknown;
};

/**
 * Get available domestic parcel services and prices from Australia Post PAC.
 * Uses from/to postcode, weight and dimensions.
 */
export async function getDomesticParcelRates(
  apiKey: string,
  params: {
    fromPostcode: string;
    toPostcode: string;
    weightKg?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  }
): Promise<AusPostParcelRate[]> {
  const {
    fromPostcode,
    toPostcode,
    weightKg = 1,
    lengthCm = 22,
    widthCm = 16,
    heightCm = 7,
  } = params;

  const from = String(fromPostcode).trim().replace(/\s+/g, "");
  const to = String(toPostcode).trim().replace(/\s+/g, "");
  if (!from || !to) {
    throw new Error("from_postcode and to_postcode are required");
  }

  // PAC domestic service endpoint returns available services; some APIs return price in the list
  const query = new URLSearchParams({
    from_postcode: from,
    to_postcode: to,
    length: String(lengthCm),
    width: String(widthCm),
    height: String(heightCm),
    weight: String(weightKg),
  });

  const url = `${AUSPOST_BASE}/postage/parcel/domestic/service.json?${query}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      [AUTH_HEADER]: apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Australia Post API error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as {
    services?: { service?: DomesticServiceEntry[] };
    postage_result?: { services?: DomesticServiceEntry[] };
    [key: string]: unknown;
  };

  const services: DomesticServiceEntry[] =
    data.services?.service ??
    data.postage_result?.services ??
    (Array.isArray(data.services) ? data.services : []);

  const rates: AusPostParcelRate[] = [];

  for (const s of services) {
    const code = s.code ?? (s as { service_code?: string }).service_code ?? "";
    const name = s.name ?? (s as { service_type?: string }).service_type ?? code;
    const rawPrice = s.price ?? s.total_cost ?? (s as { total_cost?: number }).total_cost;
    const price = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice || "0")) || 0;
    if (code) {
      rates.push({ code, name, price });
    }
  }

  // If service list doesn't include price, call calculate for each service (common PAC flow)
  if (rates.length > 0 && rates.every((r) => r.price === 0)) {
    const withPrices: AusPostParcelRate[] = [];
    for (const r of rates) {
      const total = await getDomesticParcelPrice(apiKey, {
        fromPostcode: from,
        toPostcode: to,
        serviceCode: r.code,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
      });
      withPrices.push({ ...r, price: total });
    }
    return withPrices;
  }

  return rates;
}

/**
 * Get single domestic parcel price for a service code.
 */
export async function getDomesticParcelPrice(
  apiKey: string,
  params: {
    fromPostcode: string;
    toPostcode: string;
    serviceCode: string;
    weightKg?: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  }
): Promise<number> {
  const {
    fromPostcode,
    toPostcode,
    serviceCode,
    weightKg = 1,
    lengthCm = 22,
    widthCm = 16,
    heightCm = 7,
  } = params;

  const query = new URLSearchParams({
    from_postcode: String(fromPostcode).trim(),
    to_postcode: String(toPostcode).trim(),
    service_code: serviceCode,
    length: String(lengthCm),
    width: String(widthCm),
    height: String(heightCm),
    weight: String(weightKg),
  });

  const url = `${AUSPOST_BASE}/postage/parcel/domestic/calculate.json?${query}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { [AUTH_HEADER]: apiKey },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Australia Post calculate error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as { postage_result?: { total_cost?: number }; total_cost?: number };
  const total =
    data.postage_result?.total_cost ?? (data as { total_cost?: number }).total_cost ?? 0;
  return typeof total === "number" ? total : parseFloat(String(total)) || 0;
}
