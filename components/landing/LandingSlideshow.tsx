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
      className={`relative w-full aspect-[4/3] sm:aspect-[3/2] lg:aspect-[16/10] rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a1522] shadow-lg shadow-black/20 ${className}`}
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
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#0D1B2A]/25 via-transparent to-transparent z-[1]"
        aria-hidden
      />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-[2]">
        {SLIDE_IMAGES.map((_, index) => (
          <button
            key={index}
            type="button"
            className={`h-1.5 rounded-full transition-colors ${
              index === activeIndex ? "w-5 bg-gold" : "w-1.5 bg-white/35 hover:bg-white/50"
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
