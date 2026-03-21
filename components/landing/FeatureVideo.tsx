"use client";

import { useRef, useEffect } from "react";

export default function FeatureVideo({
  src,
  playbackRate = 1.55,
  className = "",
}: {
  src: string;
  playbackRate?: number;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const setSpeed = () => {
      video.playbackRate = playbackRate;
    };
    video.addEventListener("loadedmetadata", setSpeed);
    setSpeed(); // in case already loaded
    return () => video.removeEventListener("loadedmetadata", setSpeed);
  }, [playbackRate]);

  return (
    <div className={`relative flex min-h-0 min-w-0 w-full aspect-video overflow-hidden rounded-2xl border border-[rgba(161,130,65,0.20)] shadow-2xl shadow-black/50 bg-black/30 ${className}`}>
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        loop
        playsInline
        controls
        className="absolute inset-0 h-full w-full object-contain"
        aria-label="Feature video — click to play"
      />
    </div>
  );
}
