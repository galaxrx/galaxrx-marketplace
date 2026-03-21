/**
 * Price intelligence facade — env-gated mock vs real provider.
 * Set PRICE_INTELLIGENCE_PROVIDER=mock for mock (default); set to "real" when
 * a real supplier API is wired. Use mock in CI and real in staging without code change.
 */

import {
  getMockPriceIntelligence,
  getMockPriceIntelligenceForProduct,
  type PriceIntelligenceResult,
} from "@/lib/mock-price-intelligence";

export type { PriceIntelligenceResult } from "@/lib/mock-price-intelligence";

const useMock = process.env.PRICE_INTELLIGENCE_PROVIDER !== "real";

export const IS_MOCK_PRICE_INTELLIGENCE = useMock;

export function getPriceIntelligence(
  params: Parameters<typeof getMockPriceIntelligence>[0]
): PriceIntelligenceResult {
  if (useMock) return getMockPriceIntelligence(params);
  throw new Error(
    "Real price intelligence not configured. Set PRICE_INTELLIGENCE_PROVIDER=mock or implement getRealPriceIntelligence in lib/price-intelligence.ts."
  );
}

export function getPriceIntelligenceForProduct(
  params: Parameters<typeof getMockPriceIntelligenceForProduct>[0]
): PriceIntelligenceResult {
  if (useMock) return getMockPriceIntelligenceForProduct(params);
  throw new Error(
    "Real price intelligence not configured. Set PRICE_INTELLIGENCE_PROVIDER=mock or implement getRealPriceIntelligenceForProduct in lib/price-intelligence.ts."
  );
}
