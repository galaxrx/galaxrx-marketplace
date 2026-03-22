"use client";

import { useState } from "react";
import { genUploader } from "uploadthing/client";
import type { OurFileRouter } from "@/lib/uploadthing";
import Image from "next/image";
import { shouldSkipImageLoadInProduction } from "@/lib/image-url";

const uploader = genUploader<OurFileRouter>();

type Props = {
  currentLogoUrl: string | null;
  onUploadComplete: (url: string) => Promise<void>;
};

async function uploadLogoFallback(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload/logo", {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Upload failed");
  if (!data.url) throw new Error("No URL returned");
  return data.url;
}

export default function LogoUpload({ currentLogoUrl, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image (JPG, PNG or WEBP)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be under 2MB");
      return;
    }
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    let url: string | null = null;
    try {
      const result = await uploader.uploadFiles("pharmacyLogo", {
        files: [file],
      });
      url = result[0]?.url ?? null;
    } catch {
      // UploadThing failed (e.g. not configured); try local fallback
    }
    if (!url) {
      try {
        url = await uploadLogoFallback(file);
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Upload failed");
        setUploading(false);
        e.target.value = "";
        return;
      }
    }
    try {
      await onUploadComplete(url);
      setPreview(null);
    } catch (err) {
      console.error(err);
      alert("Logo uploaded but failed to save to profile. Try saving again.");
    }
    setUploading(false);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5 border border-[rgba(161,130,65,0.2)] flex-shrink-0">
          <Image src={preview} alt="Logo" fill className="object-cover" sizes="80px" />
        </div>
      ) : currentLogoUrl && shouldSkipImageLoadInProduction(currentLogoUrl) ? (
        <div className="w-20 h-20 rounded-lg bg-white/5 border border-amber-500/30 flex items-center justify-center text-[10px] text-amber-400/90 text-center p-1 flex-shrink-0 leading-tight">
          Logo URL is from local dev — re-upload on this site
        </div>
      ) : currentLogoUrl ? (
        <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5 border border-[rgba(161,130,65,0.2)] flex-shrink-0">
          <Image src={currentLogoUrl} alt="Logo" fill className="object-cover" sizes="80px" />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-lg bg-white/5 border border-[rgba(161,130,65,0.2)] flex items-center justify-center text-white/40 text-2xl flex-shrink-0">
          🏪
        </div>
      )}
      <div>
        <label className="block">
          <span className="sr-only">Upload logo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={uploading}
            className="block w-full text-sm text-white/70 file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-gold-muted file:to-gold file:text-[#0D1B2A] file:font-bold hover:file:opacity-90"
          />
        </label>
        <p className="text-xs text-white/50 mt-1">JPG, PNG or WEBP, max 2MB</p>
      </div>
    </div>
  );
}
