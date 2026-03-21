"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export function BarcodeScanner({ onScan, onError }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(false);
  const [permission, setPermission] = useState<"pending" | "granted" | "denied">("pending");

  useEffect(() => {
    let isCancelled = false;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    (async () => {
      try {
        if (!videoRef.current) {
          return;
        }

        // Request permission explicitly first (more reliable on mobile/Safari).
        const preflightStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        preflightStream.getTracks().forEach((t) => t.stop());

        if (isCancelled) return;

        const devices = await reader.listVideoInputDevices();
        if (!devices.length) {
          setPermission("denied");
          onError?.("No camera found on this device");
          return;
        }

        const backCamera =
          devices.find((d) => {
            const label = d.label.toLowerCase();
            return label.includes("back") || label.includes("rear") || label.includes("environment");
          }) ?? devices[0];

        if (isCancelled) return;
        setPermission("granted");
        setScanning(true);

        await reader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current!,
          (result, err) => {
            if (isCancelled) return;
            if (result) {
              onScan(result.getText());
              reader.reset();
              setScanning(false);
            }
            if (err && !(err instanceof NotFoundException)) {
              console.error(err);
            }
          }
        );
      } catch (err) {
        console.error("Failed to start barcode scanner", err);
        if (isCancelled) return;
        setPermission("denied");
        onError?.("Could not access camera. Check camera permission and use HTTPS/localhost.");
      }
    })();

    return () => {
      isCancelled = true;
      readerRef.current?.reset();
    };
  }, [onScan, onError]);

  if (permission === "denied") {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-mid-navy border border-white/10 rounded-xl gap-3">
        <span className="text-4xl">📷</span>
        <p className="text-white/70 text-center px-4">
          Camera access denied. Please allow camera access in your browser settings and refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <video
        ref={videoRef}
        className="w-full rounded-lg"
        style={{ maxHeight: "300px", objectFit: "cover" }}
        autoPlay
        muted
        playsInline
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="border-2 border-primary rounded-lg w-48 h-24 opacity-70" />
      </div>
      {scanning && (
        <p className="text-center text-sm text-white/60 mt-2">
          Point camera at product barcode...
        </p>
      )}
    </div>
  );
}
