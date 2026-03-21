/**
 * Client-safe Australian address parsing (no Node APIs).
 * Parses "Number StreetName Suburb STATE 1234" so street keeps number + street name.
 */
export function parseAustralianAddress(full: string): {
  street: string;
  suburb?: string;
  state?: string;
  postcode?: string;
} {
  const trimmed = full.trim();
  if (!trimmed) return { street: trimmed };
  const statePostcode = trimmed.match(/\s+(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s+(\d{4})$/i);
  if (statePostcode) {
    const state = statePostcode[1].toUpperCase();
    const postcode = statePostcode[2];
    const before = trimmed.slice(0, trimmed.length - statePostcode[0].length).trim();
    // Suburb is the last 1–2 words (e.g. RYDE, North Ryde, St Leonards), rest is street (number + street name).
    const suburbMatch = before.match(/\s+([A-Za-z.\-]+(?:\s+[A-Za-z.\-]+)?)\s*$/);
    const suburb = suburbMatch ? suburbMatch[1].trim() : undefined;
    const street = suburbMatch ? before.slice(0, before.length - suburbMatch[0].length).trim() : before;
    return { street: street || trimmed, suburb, state, postcode };
  }
  return { street: trimmed };
}
