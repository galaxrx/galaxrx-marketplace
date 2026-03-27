"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (productName: string, rawText: string) => void;
  onError?: (message: string) => void;
};

type PermissionState = "pending" | "granted" | "denied";

const guessProductName = (rawText: string): string | null => {
  const cleaned = rawText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (cleaned.length === 0) return null;

  const scored = cleaned
    .map((line) => {
      const hasLetters = /[A-Za-z]/.test(line);
      const alphaCount = (line.match(/[A-Za-z]/g) ?? []).length;
      const digitCount = (line.match(/\d/g) ?? []).length;
      const noisy = /batch|lot|expiry|exp|use by|barcode|pbs/i.test(line);
      let score = alphaCount - digitCount;
      if (hasLetters) score += 6;
      if (line.length >= 8 && line.length <= 64) score += 3;
      if (noisy) score -= 4;
      return { line, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.line ?? null;
};

export default function ProductNameCameraReader({ onDetected, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permission, setPermission] = useState<PermissionState>("pending");
  const [isReading, setIsReading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setPermission("denied");
          onError?.("Camera is not supported on this browser.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setPermission("granted");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
          setIsReady(true);
        }
      } catch {
        setPermission("denied");
        onError?.("Could not access camera. Please allow camera permission and use HTTPS.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [onError]);

  const captureAndRead = async () => {
    if (!videoRef.current || isReading) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      onError?.("Camera is not ready yet. Please try again.");
      return;
    }

    setIsReading(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onError?.("Could not read image from camera.");
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!blob) {
        onError?.("Could not capture image from camera.");
        return;
      }

      const { recognize } = await import("tesseract.js");
      const result = await recognize(blob, "eng");
      const rawText = result.data.text?.trim() ?? "";
      const productName = guessProductName(rawText);

      if (!rawText || !productName) {
        onError?.("Could not detect product name. Try better lighting and hold the name closer.");
        return;
      }
      onDetected(productName, rawText);
    } catch {
      onError?.("Could not read text from image. Please try again.");
    } finally {
      setIsReading(false);
    }
  };

  if (permission === "denied") {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70">
        Camera access denied. Enable camera permission in browser settings, then refresh.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[rgba(161,130,65,0.25)] bg-white/[0.03] p-3">
      <video ref={videoRef} className="w-full rounded-md" autoPlay muted playsInline />
      <p className="text-xs text-white/55 mt-2">
        Point your camera at the product name, then tap capture.
      </p>
      <button
        type="button"
        disabled={!isReady || isReading}
        onClick={captureAndRead}
        className="mt-3 px-3 py-2 rounded-md bg-gold text-[#0D1B2A] text-sm font-medium disabled:opacity-50"
      >
        {isReading ? "Reading text..." : "Capture and read product name"}
      </button>
    </div>
  );
}
