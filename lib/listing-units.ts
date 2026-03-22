/** Pack size used for unit math (min 1). */
export function effectivePackSize(packSize: number | string | null | undefined): number {
  const n = Math.floor(Number(packSize));
  return n >= 1 ? n : 1;
}

/** Seller stock: full sealed packs + optional loose units (e.g. opened pack). */
export function totalUnitsFromSellerInput(params: {
  packSize: number;
  fullPacks: number;
  extraUnits?: number;
}): number {
  const ps = effectivePackSize(params.packSize);
  const packs = Math.max(0, Math.floor(params.fullPacks));
  const extra = Math.max(0, Math.floor(params.extraUnits ?? 0));
  return packs * ps + extra;
}

/** ex GST price per countable unit (tablet, etc.) from pack price. */
export function unitPriceExGstFromPackPrice(
  pricePerPack: number,
  packSize: number | string | null | undefined
): number {
  return pricePerPack / effectivePackSize(packSize);
}

/** Line total ex GST when quantity is in units (not packs). */
export function lineTotalExGstFromUnits(
  pricePerPack: number,
  packSize: number | string | null | undefined,
  quantityUnits: number
): number {
  return unitPriceExGstFromPackPrice(pricePerPack, packSize) * quantityUnits;
}

/**
 * Show unit price with enough decimals when packs are large (avoids $0.07 looking "wrong"
 * next to $0.48/pack).
 */
export function formatUnitPriceExGstDisplay(pricePerPack: number, packSize: number): string {
  const u = unitPriceExGstFromPackPrice(pricePerPack, packSize);
  if (!Number.isFinite(u) || u < 0) return "0.00";
  if (u >= 1) return u.toFixed(2);
  if (u >= 0.01) return u.toFixed(3);
  return u.toFixed(4);
}

/** Split total units into full packs + remainder for edit form. */
export function unitsToPacksAndExtra(totalUnits: number, packSize: number): { fullPacks: number; extraUnits: number } {
  const ps = effectivePackSize(packSize);
  const u = Math.max(0, Math.floor(totalUnits));
  return { fullPacks: Math.floor(u / ps), extraUnits: u % ps };
}

/**
 * Order.quantity is always sellable units (same as listing checkout), not pack count.
 * Use on orders UI so we never label "3 packs" when the buyer bought 3 tablets.
 */
export function formatOrderQuantityLabel(packSize: number | undefined | null, quantity: number): string {
  const ps = effectivePackSize(packSize ?? 1);
  const q = Math.max(0, Math.floor(quantity));
  if (ps <= 1) {
    return `${q} unit${q !== 1 ? "s" : ""}`;
  }
  const { fullPacks, extraUnits } = unitsToPacksAndExtra(q, ps);
  const bits: string[] = [];
  if (fullPacks > 0) {
    bits.push(`${fullPacks} full pack${fullPacks !== 1 ? "s" : ""} (${fullPacks * ps} units)`);
  }
  if (extraUnits > 0) {
    bits.push(`${extraUnits} unit${extraUnits !== 1 ? "s" : ""}`);
  }
  return bits.length > 0 ? bits.join(" + ") : `${q} units`;
}
