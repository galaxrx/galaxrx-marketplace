import {
  effectivePackSize,
  formatUnitPriceExGstDisplay,
  unitPriceExGstFromPackPrice,
  unitsToPacksAndExtra,
} from "@/lib/listing-units";

/** True when the seller listed with "quantity / price per unit" (API stores as packSize 1). */
export function isPerUnitListing(packSize: number | undefined | null): boolean {
  return effectivePackSize(packSize ?? 1) <= 1;
}

export function listingUnitPriceExGst(pricePerPack: number, packSize: number | undefined | null): number {
  return unitPriceExGstFromPackPrice(pricePerPack, packSize ?? 1);
}

/** Primary price headline (ex GST) for grids and detail. */
export function listingPrimaryPriceExGstLabel(pricePerPack: number, packSize: number | undefined | null): string {
  const p = Number(pricePerPack);
  if (!Number.isFinite(p) || p < 0) return "—";
  if (isPerUnitListing(packSize)) {
    return `$${p.toFixed(2)} / unit (ex GST)`;
  }
  return `$${p.toFixed(2)} / pack (ex GST)`;
}

/** Secondary line under headline, or null if redundant. */
export function listingSecondaryPriceExGstLine(
  pricePerPack: number,
  packSize: number | undefined | null
): string | null {
  if (isPerUnitListing(packSize)) return null;
  const ps = effectivePackSize(packSize ?? 1);
  return `${formatUnitPriceExGstDisplay(pricePerPack, ps)} / unit · 1 pack = ${ps} units`;
}

/** Pack / unit context for product row on cards (e.g. "60-unit packs · SEALED"). */
export function listingPackContextLine(packSize: number | undefined | null, condition: string): string {
  const ps = effectivePackSize(packSize ?? 1);
  if (ps <= 1) {
    return `Sold by unit · ${condition}`;
  }
  return `${ps} units per pack · ${condition}`;
}

/**
 * Clear buyer-facing availability: always units, plus pack breakdown when packSize > 1.
 */
export function listingBuyerAvailabilityLine(
  availableUnits: number,
  packSize: number | undefined | null,
  opts?: { listedTotal?: number; reservedUnits?: number }
): string {
  const avail = Math.max(0, Math.floor(availableUnits));
  const ps = effectivePackSize(packSize ?? 1);
  const listed = opts?.listedTotal;
  const reserved = opts?.reservedUnits ?? 0;

  if (avail < 1) {
    if (listed != null && listed >= 1 && reserved > 0) {
      return `None available right now — ${listed} listed (all ${reserved} in active checkout)`;
    }
    return "None available to buy right now";
  }

  if (ps <= 1) {
    return `${avail} unit${avail !== 1 ? "s" : ""} available to buy`;
  }

  const { fullPacks, extraUnits } = unitsToPacksAndExtra(avail, ps);
  const parts: string[] = [];
  if (fullPacks > 0) {
    parts.push(`${fullPacks} full pack${fullPacks !== 1 ? "s" : ""} (${fullPacks * ps} units)`);
  }
  if (extraUnits > 0) {
    parts.push(`${extraUnits} loose unit${extraUnits !== 1 ? "s" : ""}`);
  }
  const inner = parts.length > 0 ? parts.join(" + ") : `${avail} units`;
  return `${avail} units available to buy (${inner})`;
}
