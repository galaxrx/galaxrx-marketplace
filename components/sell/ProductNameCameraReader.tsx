"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onDetected: (productName: string, rawText: string) => void;
  onError?: (message: string) => void;
};

type PermissionState = "pending" | "granted" | "denied";

const normalizeLines = (rawText: string): string[] =>
  rawText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line) => line.replace(/[^\w\s\-+/.()%]/g, "").trim())
    .filter((line) => line.length >= 2);

const scoreLineForProductName = (line: string): number => {
  const alphaCount = (line.match(/[A-Za-z]/g) ?? []).length;
  const digitCount = (line.match(/\d/g) ?? []).length;
  const uppercaseRatio =
    alphaCount > 0 ? ((line.match(/[A-Z]/g) ?? []).length / alphaCount) : 0;
  const hasLetters = alphaCount > 0;
  const likelyNoise =
    /batch|lot|expiry|exp|use by|barcode|pbs|rx|prescription|date|mfg|manufactured|aust|artg|warning|caution/i.test(
      line
    );
  const likelyNameShape = /^[A-Za-z][A-Za-z0-9\s\-+/.()%]{3,}$/.test(line);

  let score = 0;
  if (hasLetters) score += 8;
  if (likelyNameShape) score += 4;
  if (line.length >= 8 && line.length <= 64) score += 5;
  if (uppercaseRatio > 0.2 && uppercaseRatio < 0.95) score += 2;
  score += Math.max(0, alphaCount - digitCount);
  if (digitCount > alphaCount) score -= 8;
  if (likelyNoise) score -= 10;

  return score;
};

const guessProductName = (rawText: string): string | null => {
  const cleaned = normalizeLines(rawText);

  if (cleaned.length === 0) return null;

  const scored = cleaned
    .map((line) => ({ line, score: scoreLineForProductName(line) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  return best && best.score > 2 ? best.line : null;
};

export default function ProductNameCameraReader({ onDetected, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permission, setPermission] = useState<PermissionState>("pending");
  const [isReading, setIsReading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [ocrHint, setOcrHint] = useState("Point the product name inside the box, then tap capture.");

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
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = video.videoWidth;
      srcCanvas.height = video.videoHeight;
      const srcCtx = srcCanvas.getContext("2d");
      if (!srcCtx) {
        onError?.("Could not read image from camera.");
        return;
      }
      srcCtx.drawImage(video, 0, 0, srcCanvas.width, srcCanvas.height);

      // Center-crop where label text is most likely, then upscale for OCR.
      const cropW = Math.floor(srcCanvas.width * 0.9);
      const cropH = Math.floor(srcCanvas.height * 0.42);
      const cropX = Math.floor((srcCanvas.width - cropW) / 2);
      const cropY = Math.floor((srcCanvas.height - cropH) / 2);

      const canvas = document.createElement("canvas");
      canvas.width = cropW * 2;
      canvas.height = cropH * 2;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        onError?.("Could not read image from camera.");
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(srcCanvas, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);

      // Preprocess to improve OCR quality (grayscale + contrast + threshold).
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const contrasted = gray > 145 ? 255 : gray < 75 ? 0 : gray;
        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
      }
      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
      if (!blob) {
        onError?.("Could not capture image from camera.");
        return;
      }

      const { recognize } = await import("tesseract.js");
      // Try two OCR passes with complementary settings.
      const [passA, passB] = await Promise.all([
        recognize(blob, "eng", {
          tessedit_pageseg_mode: "6",
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-+/.()% ",
        }),
        recognize(blob, "eng", {
          tessedit_pageseg_mode: "11",
          preserve_interword_spaces: "1",
        }),
      ]);
      const rawText = `${passA.data.text ?? ""}\n${passB.data.text ?? ""}`.trim();
      const productName = guessProductName(rawText);

      if (!rawText || !productName) {
        setOcrHint("No clear name found. Hold steady, improve lighting, and keep only the product name in the box.");
        onError?.("Could not detect product name clearly. Try again with better focus and lighting.");
        return;
      }
      setOcrHint("Looks good. You can capture again if needed.");
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
      <div className="relative">
        <video ref={videoRef} className="w-full rounded-md" autoPlay muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[86%] h-[40%] rounded-md border-2 border-gold/75 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
        </div>
      </div>
      <p className="text-xs text-white/65 mt-2">
        {ocrHint}
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
