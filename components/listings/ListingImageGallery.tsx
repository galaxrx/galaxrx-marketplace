"use client";

import { useState } from "react";
import Image from "next/image";

const CATEGORY_ICONS: Record<string, string> = {
  PRESCRIPTION: "💊",
  OTC: "🧴",
  VACCINES: "💉",
  VETERINARY: "🐾",
  COSMETICS: "✨",
  SUPPLEMENTS: "💪",
  DEVICES: "🩺",
  CONSUMABLES: "📦",
  OTHER: "📋",
  FRAGRANCE: "🌸",
  VITAMINS_SUPPLEMENTS: "💪",
  PREGNANCY_BABY: "👶",
  SKINCARE: "🧴",
  HAIR_CARE: "💇",
  ORAL_CARE: "🦷",
  PERSONAL_CARE: "🧼",
  MEDICINES: "💊",
  MEDICAL_SUPPLIES: "🩺",
  FIRST_AID: "🩹",
  SPORT_FITNESS: "🏃",
  HOME_PET: "🐾",
};

type Props = {
  images: string[];
  category: string;
};

export default function ListingImageGallery({ images, category }: Props) {
  const [primaryIndex, setPrimaryIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const icon = CATEGORY_ICONS[category] ?? "📋";

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-6xl">
        {icon}
      </div>
    );
  }

  const current = images[primaryIndex];

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="relative block w-full h-[18rem] sm:h-[22rem] md:h-[26rem] rounded-lg overflow-hidden bg-mid-navy border border-white/10"
        >
          <Image
            src={current}
            alt="Listing"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 56vw, 640px"
          />
        </button>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setPrimaryIndex(i)}
                className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 ${i === primaryIndex ? "border-primary" : "border-transparent"}`}
              >
                <Image src={url} alt="" fill className="object-cover" sizes="64px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white text-2xl hover:opacity-80"
          >
            ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPrimaryIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                className="absolute left-4 text-white text-3xl hover:opacity-80"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setPrimaryIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                className="absolute right-4 text-white text-3xl hover:opacity-80"
              >
                ›
              </button>
            </>
          )}
          <div className="relative w-full max-w-3xl h-[80vh] mx-4">
            <Image
              src={current}
              alt="Listing"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      )}
    </>
  );
}
