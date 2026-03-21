"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

export function useBarcode(onCode: (code: string) => void) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startScanning = useCallback(
    (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      videoRef.current = videoEl;
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setError(null);
      setIsScanning(true);
      reader
        .decodeFromVideoDevice(null, videoEl, (result, err) => {
          if (result) {
            onCode(result.getText());
            reader.reset();
            setIsScanning(false);
          }
          if (err && !(err.name === "NotFoundException")) {
            setError(err.message);
          }
        })
        .catch((err) => {
          setError(err?.message ?? "Camera access failed");
          setIsScanning(false);
        });
    },
    [onCode]
  );

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setIsScanning(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
    };
  }, []);

  return { startScanning, stopScanning, isScanning, error };
}
