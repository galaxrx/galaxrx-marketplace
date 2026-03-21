/**
 * PBS (Pharmaceutical Benefits Scheme) Australia API client.
 * Docs: https://data.pbs.gov.au/ — rate limit: 1 req/20 sec (public) or 5/min depending on version.
 */

const RATE_LIMIT_MS = 21_000; // 21 seconds between requests to respect 1/20s limit
let lastRequestTime = 0;

async function rateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export type PBSSchedule = {
  SCHEDULE_CODE?: string;
  EFFECTIVE_DATE?: string;
  [key: string]: unknown;
};

export type PBSItem = {
  DRUG_NAME?: string;
  BRAND_NAME?: string;
  LI_FORM?: string;
  LI_DRUG_NAME?: string;
  PACK_SIZE?: number | string;
  PBS_CODE?: string;
  PROGRAM_CODE?: string;
  [key: string]: unknown;
};

const DEFAULT_PBS_BASE = "https://data-api.health.gov.au/pbs/api/v3";

function getBaseUrl(): string {
  const url = process.env.PBS_API_BASE?.trim();
  if (url) return url.replace(/\/$/, "");
  return DEFAULT_PBS_BASE;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const key =
    process.env.PBS_PUBLIC_KEY?.trim() ||
    process.env.PBS_API_KEY?.trim() ||
    process.env.OCP_APIM_SUBSCRIPTION_KEY?.trim();
  if (key) {
    headers["Ocp-Apim-Subscription-Key"] = key;
  }
  return headers;
}

export async function getPbsSchedules(): Promise<PBSSchedule[]> {
  await rateLimit();
  const base = getBaseUrl();
  const res = await fetch(`${base}/schedules?format=json`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`PBS SCHEDULE failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? (data as Record<string, unknown>)?.value ?? [data];
  return list as PBSSchedule[];
}

export async function getPbsItems(scheduleCode?: string): Promise<PBSItem[]> {
  await rateLimit();
  const base = getBaseUrl();
  const params = new URLSearchParams({ format: "json" });
  if (scheduleCode) params.set("SCHEDULE_CODE", scheduleCode);
  const res = await fetch(`${base}/items?${params}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`PBS ITEM failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data as Record<string, unknown>)?.data ?? (data as Record<string, unknown>)?.items ?? (data as Record<string, unknown>)?.value ?? [data];
  return list as PBSItem[];
}

/** Map PBS item to our DrugMaster-like shape for search/display */
export function mapPbsItemToDrug(item: PBSItem): {
  productName: string;
  genericName: string | null;
  brand: string | null;
  strength: string | null;
  form: string | null;
  packSize: number | null;
  pbsCode: string | null;
  category: "PRESCRIPTION" | "OTC" | "VACCINES" | "VETERINARY" | "COSMETICS" | "SUPPLEMENTS" | "DEVICES" | "CONSUMABLES" | "OTHER";
} {
  const drugName = [item.DRUG_NAME, item.LI_DRUG_NAME, item.BRAND_NAME].find(Boolean) as string | undefined;
  const productName = drugName?.trim() || "Unknown";
  const brand = (item.BRAND_NAME as string)?.trim() || null;
  const liForm = (item.LI_FORM as string)?.trim() || null;
  const packSizeRaw = item.PACK_SIZE;
  const packSize =
    typeof packSizeRaw === "number"
      ? packSizeRaw
      : typeof packSizeRaw === "string"
        ? parseInt(packSizeRaw, 10) || null
        : null;
  const pbsCode = (item.PBS_CODE as string)?.trim() || null;
  return {
    productName,
    genericName: (item.LI_DRUG_NAME as string)?.trim() || null,
    brand,
    strength: liForm,
    form: liForm,
    packSize,
    pbsCode,
    category: "PRESCRIPTION",
  };
}
