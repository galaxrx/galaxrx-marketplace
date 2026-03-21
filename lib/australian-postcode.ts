/**
 * Australian domestic postcodes for Australia Post PAC (4 digits).
 * Rejects placeholders like 0000 that PAC rejects with 404.
 */

export function normalizeAustralianPostcode(input: string): string {
  return String(input ?? "")
    .replace(/\D/g, "")
    .slice(0, 4);
}

/**
 * True if the postcode is in a range Australia Post accepts for from/to lanes.
 * Blocks 0000, 00xx, 01xx, and other non-assignment patterns.
 */
export function isValidAustralianPostcodeForShipping(pc: string): boolean {
  const s = normalizeAustralianPostcode(pc);
  if (s.length !== 4) return false;
  if (s === "0000") return false;
  if (s.startsWith("00")) return false;
  if (s.startsWith("01")) return false;
  // TAS regional 02xx, NT 08xx, external territories 09xx
  if (s[0] === "0") {
    return s.startsWith("02") || s.startsWith("08") || s.startsWith("09");
  }
  return /^[1-9]\d{3}$/.test(s);
}
