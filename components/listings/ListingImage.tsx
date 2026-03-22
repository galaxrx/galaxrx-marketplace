"use client";

import Image from "next/image";
import { useState } from "react";
import { shouldSkipImageLoadInProduction } from "@/lib/image-url";

/**
 * Hosts allowed for next/image optimization (must match next.config.mjs remotePatterns).
 * Any other HTTPS URL (e.g. barcode API / manufacturer CDNs) uses a plain <img> so we
 * don't break the page when the optimizer rejects the host or the file 404s.
 */
function shouldUseNextImage(src: string): boolean {
  try {
    const u = new URL(src);
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return true;
    }
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "utfs.io" || h === "ufs.sh") return true;
    if (h.endsWith(".ufs.sh") || h.endsWith(".uploadthing.com")) return true;
    if (h === "images.barcodelookup.com") return true;
    return false;
  } catch {
    return false;
  }
}

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  /** When true, thumbnail is shorter (buy grid). */
  compact?: boolean;
};

export default function ListingImage({
  src,
  alt,
  fill = true,
  width,
  height,
  className = "object-contain",
  sizes,
  compact,
}: Props) {
  const [broken, setBroken] = useState(false);

  if (!src?.trim() || broken) {
    return (
      <span className="text-white/40 text-xs px-2 text-center">
        {broken ? "Image unavailable" : "No image"}
      </span>
    );
  }

  const trimmed = src.trim();

  if (shouldSkipImageLoadInProduction(trimmed)) {
    return (
      <span className="text-white/40 text-xs px-2 text-center">No image</span>
    );
  }

  if (!shouldUseNextImage(trimmed)) {
    if (fill) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- intentional fallback for arbitrary product image CDNs
        <img
          src={trimmed}
          alt={alt}
          className={`absolute inset-0 w-full h-full ${className}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmed}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }

  if (!fill && width != null && height != null) {
    return (
      <Image
        src={trimmed}
        alt={alt}
        width={width}
        height={height}
        className={className}
        sizes={sizes}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <Image
      src={trimmed}
      alt={alt}
      fill
      className={className}
      sizes={
        sizes ??
        (compact
          ? "(max-width: 640px) 90vw, 200px"
          : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw")
      }
      onError={() => setBroken(true)}
    />
  );
}
