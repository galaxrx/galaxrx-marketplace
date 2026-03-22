/**
 * URLs saved during local dev (disk uploads) point at localhost/127.0.0.1.
 * They break in production: next/image returns 400, browsers block mixed content.
 */
export function isLocalDevOnlyImageUrl(src: string): boolean {
  try {
    const s = src.trim();
    if (s.startsWith("blob:") || s.startsWith("data:")) return false;
    const u = new URL(s);
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") return true;
    return false;
  } catch {
    return false;
  }
}

/** In production, never load these — show a placeholder instead. */
export function shouldSkipImageLoadInProduction(src: string | null | undefined): boolean {
  if (!src?.trim()) return false;
  return process.env.NODE_ENV === "production" && isLocalDevOnlyImageUrl(src);
}
