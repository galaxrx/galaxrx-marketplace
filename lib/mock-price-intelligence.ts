/**
 * MOCK PRICE INTELLIGENCE SERVICE — DEVELOPMENT ONLY
 * Replace this entire module with a real supplier API integration before production.
 * The real API would call supplier systems (e.g. API2Cart, Sigma, Australian Pharmaceutical
 * Industries, EBOS, or similar) to get current RRP and wholesale cost.
 *
 * To replace: implement the same PriceIntelligenceResult interface in a new
 * lib/price-intelligence.ts and swap the import in the API route.
 */

export const IS_MOCK_PRICE_INTELLIGENCE = true;

export type SupplierPriceData = {
  productName: string;
  supplierRRP: number;        // Current recommended retail price from supplier
  wholesaleCost: number;      // Typical wholesale cost (indicative)
  lastUpdated: string;        // ISO date string
  source: string;             // e.g. "Sigma Healthcare" or "API2Cart Mock"
};

export type MarketComparison = {
  listingId: string;
  price: number;
  quantity: number;
  daysUntilExpiry: number | null;
  condition: string;
  pharmacyName: string;
};

export type PriceIntelligenceResult = {
  productName: string;
  supplierData: SupplierPriceData | null;
  marketListings: MarketComparison[];   // Other active listings for same product
  suggestedSellerPrice: number;          // What seller should list/adjust to
  suggestedBuyerOffer: number;           // What buyer should offer
  sellerReasoning: string;               // Human-readable explanation for seller
  buyerReasoning: string;                // Human-readable explanation for buyer
  confidence: "HIGH" | "MEDIUM" | "LOW"; // Based on data availability
  isMock: true;
};

// Mock supplier database — keyed by lowercase product name fragments
const MOCK_SUPPLIER_DATA: Record<string, SupplierPriceData> = {
  "paracetamol 500mg": {
    productName: "Paracetamol 500mg Tablets",
    supplierRRP: 9.99,
    wholesaleCost: 4.20,
    lastUpdated: new Date().toISOString(),
    source: "Sigma Healthcare (Mock)",
  },
  "ibuprofen 200mg": {
    productName: "Ibuprofen 200mg Tablets",
    supplierRRP: 14.99,
    wholesaleCost: 6.50,
    lastUpdated: new Date().toISOString(),
    source: "API2Cart Mock",
  },
  "nurofen 200mg": {
    productName: "Nurofen 200mg Tablets",
    supplierRRP: 12.99,
    wholesaleCost: 5.80,
    lastUpdated: new Date().toISOString(),
    source: "Sigma Healthcare (Mock)",
  },
  "panadol 500mg": {
    productName: "Panadol 500mg Tablets",
    supplierRRP: 11.99,
    wholesaleCost: 5.20,
    lastUpdated: new Date().toISOString(),
    source: "API2Cart Mock",
  },
  "panadol osteo": {
    productName: "Panadol Osteo 665mg Tablets",
    supplierRRP: 16.99,
    wholesaleCost: 7.80,
    lastUpdated: new Date().toISOString(),
    source: "Sigma Healthcare (Mock)",
  },
  "blackmores": {
    productName: "Blackmores Bio Iron Advanced 30 Tablets",
    supplierRRP: 24.99,
    wholesaleCost: 11.50,
    lastUpdated: new Date().toISOString(),
    source: "API2Cart Mock",
  },
  "sudocrem": {
    productName: "Sudocrem Healing Cream 125g",
    supplierRRP: 13.99,
    wholesaleCost: 6.20,
    lastUpdated: new Date().toISOString(),
    source: "Sigma Healthcare (Mock)",
  },
  "la roche posay": {
    productName: "La Roche Posay Anthelios SPF50+",
    supplierRRP: 39.99,
    wholesaleCost: 18.50,
    lastUpdated: new Date().toISOString(),
    source: "API2Cart Mock",
  },
};

function findSupplierData(productName: string): SupplierPriceData | null {
  const lower = productName.toLowerCase();
  for (const [key, data] of Object.entries(MOCK_SUPPLIER_DATA)) {
    if (lower.includes(key)) return data;
  }
  return null;
}

function daysBetween(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Core pricing logic — seller suggestion.
 * Rules:
 * - Start from supplierRRP or market average (whichever is available)
 * - Apply expiry discount: <30 days = 40% off, 30-60 days = 25% off,
 *   60-90 days = 15% off, >90 days = 5% off (standard overstock discount)
 * - Undercut lowest competing listing by 5-10% to move stock
 * - Never suggest below wholesale cost if known
 * - Round to nearest $0.50
 */
function calculateSellerSuggestion(
  listingPrice: number,
  supplierData: SupplierPriceData | null,
  marketListings: MarketComparison[],
  daysUntilExpiry: number | null
): { price: number; reasoning: string; confidence: "HIGH" | "MEDIUM" | "LOW" } {
  const otherPrices = marketListings.map((m) => m.price);
  const marketAvg =
    otherPrices.length > 0
      ? otherPrices.reduce((a, b) => a + b, 0) / otherPrices.length
      : null;
  const lowestMarket = otherPrices.length > 0 ? Math.min(...otherPrices) : null;
  const basePrice = supplierData?.supplierRRP ?? marketAvg ?? listingPrice;

  // Expiry urgency discount
  let expiryDiscount = 0.05; // default: standard overstock
  let expiryNote = "stock is not near expiry";
  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry < 0) {
      expiryDiscount = 0.6;
      expiryNote = "stock is EXPIRED — consider removing listing";
    } else if (daysUntilExpiry < 30) {
      expiryDiscount = 0.40;
      expiryNote = `only ${daysUntilExpiry} days until expiry — price aggressively`;
    } else if (daysUntilExpiry < 60) {
      expiryDiscount = 0.25;
      expiryNote = `${daysUntilExpiry} days until expiry — price competitively`;
    } else if (daysUntilExpiry < 90) {
      expiryDiscount = 0.15;
      expiryNote = `${daysUntilExpiry} days until expiry — slight discount recommended`;
    } else {
      expiryNote = `${daysUntilExpiry}+ days until expiry — standard overstock discount`;
    }
  }

  let suggested = basePrice * (1 - expiryDiscount);

  // Undercut lowest market listing slightly to move stock
  if (lowestMarket !== null && suggested > lowestMarket * 0.95) {
    suggested = lowestMarket * 0.92;
  }

  // Floor at wholesale cost if known
  if (supplierData && suggested < supplierData.wholesaleCost) {
    suggested = supplierData.wholesaleCost * 1.05;
  }

  // Round to nearest $0.50
  suggested = Math.round(suggested * 2) / 2;

  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    supplierData && marketListings.length >= 2
      ? "HIGH"
      : supplierData || marketListings.length >= 1
      ? "MEDIUM"
      : "LOW";

  const marketNote =
    marketListings.length > 0
      ? `${marketListings.length} similar listing(s) on GalaxRX at avg $${marketAvg?.toFixed(2)}, lowest $${lowestMarket?.toFixed(2)}`
      : "no competing listings found on GalaxRX";

  const rrpNote = supplierData
    ? `Supplier RRP is $${supplierData.supplierRRP.toFixed(2)} (${supplierData.source})`
    : "no supplier RRP available";

  const reasoning = `${rrpNote}. ${marketNote}. ${expiryNote.charAt(0).toUpperCase() + expiryNote.slice(1)}. Suggested price: $${suggested.toFixed(2)} — ${Math.round(expiryDiscount * 100)}% below base price.`;

  return { price: suggested, reasoning, confidence };
}

/**
 * Core pricing logic — buyer negotiation suggestion.
 * Favor the seller: only suggest a meaningful discount when there is a strong reason
 * (short expiry, many competitors). Otherwise keep suggested offer close to list price.
 */
function calculateBuyerSuggestion(
  listingPrice: number,
  marketListings: MarketComparison[],
  daysUntilExpiry: number | null
): { price: number; reasoning: string } {
  let targetDiscount = 0.05; // baseline: only 5% — seller-favorable
  const notes: string[] = [];

  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry < 0) {
      targetDiscount = 0.25;
      notes.push(`stock is expired — you have strong reason to ask for a discount`);
    } else if (daysUntilExpiry < 30) {
      targetDiscount = 0.18;
      notes.push(`stock expires in ${daysUntilExpiry} days — reasonable to ask for a modest discount`);
    } else if (daysUntilExpiry < 60) {
      targetDiscount = 0.12;
      notes.push(`stock expires in ${daysUntilExpiry} days — small discount may be justified`);
    } else if (daysUntilExpiry < 90) {
      targetDiscount = 0.08;
      notes.push(`expiry in ${daysUntilExpiry} days — only a small reduction is reasonable`);
    } else {
      notes.push(`long expiry — seller has little reason to reduce; offer close to list price`);
    }
  } else {
    notes.push(`no expiry data — suggest an offer close to list price unless you have another strong reason`);
  }

  if (marketListings.length >= 3) {
    targetDiscount = Math.min(targetDiscount + 0.03, 0.20);
    notes.push(`${marketListings.length} other listings — some room to negotiate`);
  } else if (marketListings.length > 0) {
    notes.push(`few alternatives — seller has less pressure to discount`);
  }

  const suggestedOffer = Math.round(listingPrice * (1 - targetDiscount) * 2) / 2;
  const saving = listingPrice - suggestedOffer;
  const savingPct = Math.round(targetDiscount * 100);

  const marketLowest =
    marketListings.length > 0
      ? Math.min(...marketListings.map((m) => m.price))
      : null;

  const marketNote = marketLowest
    ? `Lowest competing listing: $${marketLowest.toFixed(2)}. `
    : "No competing listings — only ask for a discount if you have a strong reason (e.g. volume, quick payment). ";

  const reasoning = `Listed at $${listingPrice.toFixed(2)}. ${marketNote}${notes.join(". ")} Suggested offer: $${suggestedOffer.toFixed(2)}${savingPct > 0 ? ` — $${saving.toFixed(2)} (${savingPct}% below ask). Only push for a lower price when expiry is near or competition is high.` : " — close to list price (seller-friendly)."}`;

  return { price: suggestedOffer, reasoning };
}

/**
 * Main entry point — call this from the listing API route.
 * Pass all active listings for the same product so market comparison works.
 */
export function getMockPriceIntelligence(params: {
  productName: string;
  listingPrice: number;
  listingId: string;
  expiryDate?: Date | string | null;
  allActiveListings: Array<{
    id: string;
    pricePerPack: number;
    quantityUnits: number;
    expiryDate?: Date | string | null;
    condition?: string | null;
    pharmacy: { name: string };
  }>;
}): PriceIntelligenceResult {
  const { productName, listingPrice, listingId, expiryDate, allActiveListings } = params;

  const supplierData = findSupplierData(productName);
  const daysUntilExpiry = daysBetween(expiryDate);

  // Build market comparison from other active listings (exclude this listing)
  const marketListings: MarketComparison[] = allActiveListings
    .filter((l) => l.id !== listingId)
    .map((l) => ({
      listingId: l.id,
      price: l.pricePerPack,
      quantity: l.quantityUnits,
      daysUntilExpiry: daysBetween(l.expiryDate),
      condition: l.condition ?? "SEALED",
      pharmacyName: l.pharmacy.name,
    }));

  const seller = calculateSellerSuggestion(
    listingPrice, supplierData, marketListings, daysUntilExpiry
  );
  const buyer = calculateBuyerSuggestion(listingPrice, marketListings, daysUntilExpiry);

  return {
    productName,
    supplierData,
    marketListings,
    suggestedSellerPrice: seller.price,
    suggestedBuyerOffer: buyer.price,
    sellerReasoning: seller.reasoning,
    buyerReasoning: buyer.reasoning,
    confidence: seller.confidence,
    isMock: true,
  };
}

/**
 * Product-only entry point — for wanted items (no specific listing).
 * referencePrice: used as "listing price" for buyer suggestion; for seller uses market/supplier base.
 */
export function getMockPriceIntelligenceForProduct(params: {
  productName: string;
  referencePrice?: number | null;
  allActiveListings: Array<{
    id: string;
    pricePerPack: number;
    quantityUnits: number;
    expiryDate?: Date | string | null;
    condition?: string | null;
    pharmacy: { name: string };
  }>;
}): PriceIntelligenceResult {
  const { productName, referencePrice, allActiveListings } = params;

  const supplierData = findSupplierData(productName);
  const marketListings: MarketComparison[] = allActiveListings.map((l) => ({
    listingId: l.id,
    price: l.pricePerPack,
    quantity: l.quantityUnits,
    daysUntilExpiry: daysBetween(l.expiryDate),
    condition: l.condition ?? "SEALED",
    pharmacyName: l.pharmacy.name,
  }));

  const otherPrices = marketListings.map((m) => m.price);
  const marketAvg = otherPrices.length > 0
    ? otherPrices.reduce((a, b) => a + b, 0) / otherPrices.length
    : null;
  const lowestMarket = otherPrices.length > 0 ? Math.min(...otherPrices) : null;
  const basePrice = supplierData?.supplierRRP ?? marketAvg ?? (referencePrice ?? 0);
  const listingPrice = referencePrice ?? marketAvg ?? basePrice;

  // No specific listing expiry — use standard overstock discount for seller
  const seller = calculateSellerSuggestion(
    listingPrice,
    supplierData,
    marketListings,
    null
  );

  // For buyer: use referencePrice (e.g. offer price) or market avg
  const buyerRefPrice = referencePrice ?? marketAvg ?? basePrice;
  const buyer = calculateBuyerSuggestion(buyerRefPrice, marketListings, null);

  return {
    productName,
    supplierData,
    marketListings,
    suggestedSellerPrice: seller.price,
    suggestedBuyerOffer: buyer.price,
    sellerReasoning: seller.reasoning,
    buyerReasoning: buyer.reasoning,
    confidence: seller.confidence,
    isMock: true,
  };
}
