/**
 * GalaxRX platform / company details for invoices, My Account EFT, and support.
 * Override via env if needed (e.g. NEXT_PUBLIC_PLATFORM_NAME).
 */
export const PLATFORM = {
  name: process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "GalaxRX",
  legalName: process.env.NEXT_PUBLIC_PLATFORM_LEGAL_NAME ?? "GalaxRX Pty Ltd",
  address: process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ?? "Sydney NSW",
  /** Display / contact number; override via NEXT_PUBLIC_PLATFORM_PHONE. E.164 +61402098652. */
  phone: process.env.NEXT_PUBLIC_PLATFORM_PHONE ?? "+61 402 098 652",
  email: process.env.NEXT_PUBLIC_PLATFORM_EMAIL ?? "team@galaxrx.com.au",
  /** Support / operational contact (transactional Reply-To, invoices, seller help). */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@galaxrx.com.au",
  website: process.env.NEXT_PUBLIC_PLATFORM_WEBSITE ?? "www.galaxrx.com.au",
  /** @galaxrx on Instagram */
  instagramUrl:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "https://www.instagram.com/galaxrx/",
  /** GalaxRX company page on LinkedIn */
  linkedinUrl:
    process.env.NEXT_PUBLIC_LINKEDIN_URL?.trim() || "https://www.linkedin.com/company/galaxrx/",
  abn: process.env.NEXT_PUBLIC_PLATFORM_ABN ?? "",
  // EFT / Direct deposit (for members to pay invoices or top-up)
  eft: {
    bankName: process.env.NEXT_PUBLIC_EFT_BANK_NAME ?? "SUNCORP BANK",
    bsb: process.env.NEXT_PUBLIC_EFT_BSB ?? "484-788",
    accountNumber: process.env.NEXT_PUBLIC_EFT_ACCOUNT ?? "167-813-287",
    accountName: process.env.NEXT_PUBLIC_EFT_ACCOUNT_NAME ?? "GalaxRX Pty Ltd",
  },
  paymentTermsDays: 30,
  platformFeePercent: 3.5,
  gstPercent: 10,
} as const;

/** E.164-style value for tel: links; null if no phone configured. */
export function platformTelHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let d = t.replace(/[^\d+]/g, "");
  if (!d) return null;
  if (d.startsWith("+")) return d;
  if (d.startsWith("0") && d.length >= 9) return `+61${d.slice(1)}`;
  if (d.startsWith("61")) return `+${d}`;
  return `+${d}`;
}
