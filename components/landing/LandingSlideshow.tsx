"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { FULL_BLEED_MIN_H } from "@/components/landing/fullBleedShared";

const SLIDE_IMAGES = ["/slides/1.png.png", "/slides/2.png.png", "/slides/3.png.png", "/slides/4.jpg.jpg"];
const INTERVAL_MS = 6000;

type Variant = "default" | "fullBleed";

export default function LandingSlideshow({
  className = "",
  variant = "default",
  children,
}: {
  className?: string;
  variant?: Variant;
  /** When variant is fullBleed, rendered on top of slides with a darker scrim behind copy. */
  children?: ReactNode;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDE_IMAGES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const slideStack = (
    <>
      {SLIDE_IMAGES.map((src, index) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{
            opacity: index === activeIndex ? 1 : 0,
            zIndex: index === activeIndex ? 1 : 0,
          }}
          aria-hidden={index !== activeIndex}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={variant === "fullBleed" ? "" : `Slide ${index + 1}`}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading={index === 0 ? "eager" : "lazy"}
            aria-hidden={variant === "fullBleed" ? true : undefined}
          />
        </div>
      ))}
      {variant === "default" && (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#0D1B2A]/40 via-transparent to-[#0D1B2A]/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-40 mix-blend-overlay bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(201,168,76,0.15),transparent)]"
            aria-hidden
          />
        </>
      )}
      {variant === "fullBleed" && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#0D1B2A]/45 via-transparent to-[#0D1B2A]/25"
          aria-hidden
        />
      )}
    </>
  );

  const dots = (
    <div className="absolute bottom-4 left-1/2 z-[5] flex -translate-x-1/2 gap-2 rounded-full border border-white/[0.08] bg-black/45 px-2 py-1.5 backdrop-blur-sm sm:bottom-6">
      {SLIDE_IMAGES.map((_, index) => (
        <button
          key={index}
          type="button"
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === activeIndex
              ? "w-6 bg-gold shadow-[0_0_12px_rgba(201,168,76,0.5)]"
              : "w-1.5 bg-white/30 hover:w-2 hover:bg-white/55"
          }`}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === activeIndex ? "true" : undefined}
          onClick={() => goTo(index)}
        />
      ))}
    </div>
  );

  if (variant === "fullBleed") {
    return (
      <div
        className={`group/slides relative w-full overflow-hidden ${FULL_BLEED_MIN_H} ${className}`}
        aria-label="Platform screenshots"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0 z-0 bg-[#0a1522]">{slideStack}</div>

        {/* Localized darker theme behind copy — not full-width wash */}
        <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden>
          {/* Mobile / small screens: heavier scrim toward bottom where stacked copy sits */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05080d]/95 via-[#0D1B2A]/55 to-transparent sm:from-[#0D1B2A]/75 sm:via-[#0D1B2A]/35 sm:to-transparent lg:hidden" />
          {/* Desktop: dark panel from the left behind left-aligned text */}
          <div className="absolute inset-y-0 left-0 hidden w-[min(100%,28rem)] bg-gradient-to-r from-[#05080d]/98 via-[#0D1B2A]/92 to-transparent sm:w-[min(100%,34rem)] lg:block lg:w-[min(52%,42rem)] xl:w-[min(48%,44rem)]" />
          <div className="absolute inset-y-0 left-0 hidden w-[min(52%,42rem)] bg-gradient-to-r from-black/50 via-[#0D1B2A]/40 to-transparent lg:block xl:from-black/40" />
        </div>

        <div
          className={`relative z-[3] flex flex-col justify-center px-4 py-12 sm:px-8 sm:py-14 lg:px-14 lg:py-16 xl:px-16 xl:py-20 2xl:px-20 ${FULL_BLEED_MIN_H}`}
        >
          {children}
        </div>
        {dots}
      </div>
    );
  }

  return (
    <div
      className={`group/slides relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#0a1522] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-gold/15 transition-shadow duration-500 hover:shadow-[0_32px_80px_-20px_rgba(201,168,76,0.12),0_24px_64px_-16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(201,168,76,0.12)] sm:aspect-[3/2] lg:aspect-[16/10] ${className}`}
      aria-label="Platform screenshots"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slideStack}
      {dots}
    </div>
  );
}
