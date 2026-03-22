"use client";

import { useState, useEffect, useCallback } from "react";

const SLIDE_IMAGES = ["/slides/1.png.png", "/slides/2.png.png", "/slides/3.png.png", "/slides/4.jpg.jpg"];
const INTERVAL_MS = 6000;

export default function LandingSlideshow({ className = "" }: { className?: string }) {
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

  return (
    <div
      className={`group/slides relative w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/10] rounded-2xl overflow-hidden bg-[#0a1522] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-gold/15 transition-shadow duration-500 hover:shadow-[0_32px_80px_-20px_rgba(201,168,76,0.12),0_24px_64px_-16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(201,168,76,0.12)] ${className}`}
      aria-label="Platform screenshots"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
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
            alt={`Slide ${index + 1}`}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading={index === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0D1B2A]/40 via-transparent to-[#0D1B2A]/10 z-[1]"
        aria-hidden
      />
      <div
        className="absolute inset-0 pointer-events-none z-[1] opacity-40 mix-blend-overlay bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(201,168,76,0.15),transparent)]"
        aria-hidden
      />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-[2] rounded-full bg-black/35 px-2 py-1.5 backdrop-blur-sm border border-white/[0.08]">
        {SLIDE_IMAGES.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "w-6 bg-gold shadow-[0_0_12px_rgba(201,168,76,0.5)]"
                : "w-1.5 bg-white/30 hover:bg-white/55 hover:w-2"
            }`}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
