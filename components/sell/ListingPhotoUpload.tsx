"use client";

import { useRef, useState } from "react";
import { genUploader } from "uploadthing/client";
import type { OurFileRouter } from "@/lib/uploadthing";
import { toast } from "sonner";

const uploader = genUploader<OurFileRouter>();
const MAX_IMAGES = 6;

type Props = {
  images: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  labelClass?: string;
};

function getUrlFromResult(item: { url?: string; file?: { url?: string } } | null): string | undefined {
  if (!item) return undefined;
  if (typeof item.url === "string") return item.url;
  if (item.file && typeof item.file.url === "string") return item.file.url;
  return undefined;
}

export default function ListingPhotoUpload({ images, onChange, disabled, labelClass }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadListingImageFallback(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/listing-image", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message ?? "Upload failed");
    if (!data.url) throw new Error("No URL returned");
    return data.url;
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;
    if (images.length >= MAX_IMAGES) return;
    setUploading(true);
    let url: string | undefined;
    try {
      const result = await uploader.uploadFiles("listingImages", { files: [file] });
      url = getUrlFromResult(result[0] as { url?: string; file?: { url?: string } });
    } catch {
      // Uploadthing not configured or failed; use local fallback
    }
    if (!url) {
      try {
        url = await uploadListingImageFallback(file);
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Photo upload failed.");
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
        return;
      }
    }
    onChange([...images, url].slice(0, MAX_IMAGES));
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  const label = labelClass ?? "block text-sm font-medium text-white/80 mb-1";

  return (
    <div>
      <label className={label}>Photos (optional, max {MAX_IMAGES})</label>
      <div className="flex flex-wrap gap-3 mt-1">
        {images.map((url, i) => (
          <div key={`${url}-${i}`} className="relative group">
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5 border border-[rgba(161,130,65,0.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/90 text-white text-xs font-bold flex items-center justify-center hover:bg-red-500"
                aria-label="Remove photo"
              >
                ×
              </button>
            )}
          </div>
        ))}
        {images.length < MAX_IMAGES && !disabled && !uploading && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-[rgba(161,130,65,0.4)] text-white/50 hover:border-gold/60 hover:text-white/70 flex flex-col items-center justify-center gap-0.5 text-xs"
            >
              <span className="text-lg">📁</span>
              Upload
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-[rgba(161,130,65,0.4)] text-white/50 hover:border-gold/60 hover:text-white/70 flex flex-col items-center justify-center gap-0.5 text-xs"
            >
              <span className="text-lg">📷</span>
              Camera
            </button>
          </div>
        )}
        {uploading && (
          <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gold/50 flex items-center justify-center text-white/60 text-xs">
            Uploading…
          </div>
        )}
      </div>
    </div>
  );
}
