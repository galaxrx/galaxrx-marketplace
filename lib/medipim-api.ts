/**
 * Medipim AU API V4 client.
 * Docs: https://platform.au.medipim.com/docs/api/v4/using-the-api.html
 * Auth: HTTP Basic (API key + secret). Rate limit: 100 requests/minute.
 */

const REQUESTS_PER_MINUTE = 100;
const RATE_LIMIT_MS = Math.ceil((60 * 1000) / REQUESTS_PER_MINUTE);
const requestTimes: number[] = [];

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = requestTimes.filter((t) => t > windowStart);
  if (recent.length >= REQUESTS_PER_MINUTE) {
    const oldest = Math.min(...recent);
    const wait = 60_000 - (now - oldest);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  requestTimes.push(Date.now());
  if (requestTimes.length > REQUESTS_PER_MINUTE) requestTimes.shift();
}

const DEFAULT_BASE = "https://api.au.medipim.com";

function getBaseUrl(): string {
  const url = process.env.MEDIPIM_API_BASE?.trim();
  if (url) return url.replace(/\/$/, "");
  return DEFAULT_BASE;
}

function getAuthHeader(): string {
  const key = process.env.MEDIPIM_API_KEY?.trim() || process.env.MEDIPIM_API_ID?.trim();
  const secret = process.env.MEDIPIM_API_SECRET?.trim();
  if (!key || !secret) return "";
  const encoded = Buffer.from(`${key}:${secret}`, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": process.env.MEDIPIM_USER_AGENT?.trim() || "GalaxRX-Marketplace/1.0 (Medipim sync)",
  };
  const auth = getAuthHeader();
  if (auth) headers["Authorization"] = auth;
  return headers;
}

export type MedipimProductFilter = {
  status?: "active" | "inactive" | "replaced" | ("active" | "inactive" | "replaced")[];
  minimumContent?: boolean;
  updatedSince?: number | { from: number; until: number };
  and?: MedipimProductFilter[];
  or?: MedipimProductFilter[];
  [key: string]: unknown;
};

export type MedipimProductSorting = {
  id?: "ASC" | "DESC";
  createdAt?: "ASC" | "DESC";
  touchedAt?: "ASC" | "DESC";
  name?: { direction: "ASC" | "DESC"; locale: string };
  pbs?: "ASC" | "DESC";
  [key: string]: unknown;
};

export type MedipimProductsQueryBody = {
  filter: MedipimProductFilter;
  sorting: MedipimProductSorting;
  page: { size?: 10 | 50 | 100 | 250; no: number };
};

export type MedipimProduct = {
  id: number;
  name?: Record<string, string>;
  pbs?: string;
  ean?: string[];
  eanGtin13?: string[];
  eanGtin14?: string[];
  scheduleCode?: string;
  brands?: Array<{ id: number; name?: Record<string, string> }>;
  photos?: Array<{
    formats?: {
      medium?: string;
      mediumWebp?: string;
      thumbnail?: string;
      large?: string;
    };
  }>;
  [key: string]: unknown;
};

export type MedipimProductsQueryResponse = {
  meta?: { page?: { size: number; offset: number; no: number } };
  results?: MedipimProduct[];
};

/** POST /v4/products/query — paginated products */
export async function medipimProductsQuery(
  body: MedipimProductsQueryBody
): Promise<MedipimProductsQueryResponse> {
  await rateLimit();
  const base = getBaseUrl();
  const res = await fetch(`${base}/v4/products/query`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Medipim products/query failed: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }
  return res.json() as Promise<MedipimProductsQueryResponse>;
}

/** POST /v4/products/stream — stream products (one JSON object per line). Calls onProduct for each. */
export async function medipimProductsStream(
  filter: MedipimProductFilter,
  sorting: MedipimProductSorting,
  onProduct: (product: MedipimProduct, meta: { index: number; total: number }) => Promise<void> | void
): Promise<void> {
  await rateLimit();
  const base = getBaseUrl();
  const res = await fetch(`${base}/v4/products/stream`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ filter, sorting }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Medipim products/stream failed: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Medipim stream: no response body");
  const dec = new TextDecoder();
  let buffer = "";
  let index = 0;
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const row = JSON.parse(trimmed) as { meta?: { index: number; total: number }; result?: MedipimProduct };
        if (row.meta) {
          index = row.meta.index;
          total = row.meta.total;
        }
        if (row.result) await onProduct(row.result, { index, total });
      } catch {
        // skip malformed lines
      }
    }
  }
  if (buffer.trim()) {
    try {
      const row = JSON.parse(buffer.trim()) as { meta?: { index: number; total: number }; result?: MedipimProduct };
      if (row.result) await onProduct(row.result, { index: row.meta?.index ?? index, total: row.meta?.total ?? total });
    } catch {
      // skip
    }
  }
}

/** Map Medipim product to DrugMaster-like shape */
export function mapMedipimProductToDrug(p: MedipimProduct): {
  productName: string;
  genericName: string | null;
  brand: string | null;
  strength: string | null;
  form: string | null;
  packSize: number | null;
  pbsCode: string | null;
  barcode: string | null;
  category: "PRESCRIPTION" | "OTC" | "VACCINES" | "VETERINARY" | "COSMETICS" | "SUPPLEMENTS" | "DEVICES" | "CONSUMABLES" | "OTHER";
  imageUrl: string | null;
} {
  const nameEn = p.name?.en ?? p.name?.en_AU ?? Object.values(p.name ?? {}).find(Boolean);
  const productName = (nameEn ?? String(p.id)).trim() || "Unknown";
  const brandName = p.brands?.[0]?.name?.en ?? p.brands?.[0]?.name?.en_AU ?? p.brands?.[0]?.name ? Object.values(p.brands[0].name)[0] : null;
  const brand = typeof brandName === "string" ? brandName.trim() : null;
  const pbsCode = typeof p.pbs === "string" ? p.pbs.trim() || null : null;
  const ean13 = Array.isArray(p.eanGtin13) ? p.eanGtin13[0] : null;
  const ean = Array.isArray(p.ean) ? p.ean[0] : null;
  const barcode = (ean13 ?? ean ?? null)?.trim() || null;
  const photo = p.photos?.[0]?.formats;
  const imageUrl = (photo?.medium ?? photo?.mediumWebp ?? photo?.thumbnail ?? null)?.trim() || null;
  const schedule = (p.scheduleCode as string)?.toUpperCase?.();
  let category: "PRESCRIPTION" | "OTC" | "VACCINES" | "VETERINARY" | "COSMETICS" | "SUPPLEMENTS" | "DEVICES" | "CONSUMABLES" | "OTHER" = "OTHER";
  if (schedule && ["S4", "S4D", "S8", "S3"].includes(schedule)) category = "PRESCRIPTION";
  else if (schedule === "S2") category = "OTC";

  return {
    productName,
    genericName: null,
    brand,
    strength: null,
    form: null,
    packSize: null,
    pbsCode,
    barcode,
    category,
    imageUrl,
  };
}
