"use client";

import { useMemo, useState } from "react";

type Props = {
  videoId: string;
  title?: string;
  className?: string;
};

export default function InstructionVideoCard({
  videoId,
  title = "GalaxRX instruction video",
  className = "",
}: Props) {
  const [started, setStarted] = useState(false);

  const thumbnailUrl = useMemo(() => `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, [videoId]);
  const embedUrl = useMemo(
    () => `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
    [videoId]
  );

  return (
    <div
      className={`group relative aspect-video overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0b1320] shadow-[0_30px_80px_-35px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.04] ${className}`}
    >
      {!started ? (
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="relative h-full w-full cursor-pointer"
          aria-label={`Play ${title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/90 via-[#0D1B2A]/35 to-[#0D1B2A]/25" aria-hidden />
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-gold/50 bg-[#0D1B2A]/85 text-gold shadow-[0_0_30px_rgba(201,168,76,0.35)] backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current">
                <path d="M8 6.5v11l10-5.5-10-5.5z" />
              </svg>
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <p className="font-heading text-sm font-semibold text-white sm:text-base">{title}</p>
            <p className="mt-1 text-xs text-white/70 sm:text-sm">Tap to watch on-site</p>
          </div>
        </button>
      ) : (
        <iframe
          className="h-full w-full"
          src={embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}
    </div>
  );
}
