"use client";

import { useRef, useState } from "react";
import { genUploader } from "uploadthing/client";
import type { OurFileRouter } from "@/lib/uploadthing";
import { toast } from "sonner";
import { shouldSkipImageLoadInProduction } from "@/lib/image-url";

const uploader = genUploader<OurFileRouter>();

function getUrlFromResult(item: { url?: string; file?: { url?: string } } | null): string | undefined {
  if (!item) return undefined;
  if (typeof item.url === "string") return item.url;
  if (item.file && typeof item.file.url === "string") return item.file.url;
  return undefined;
}

async function uploadPhotoFallback(file: File): Promise<string> {
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

const URGENCIES = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

export default function WantedItemForm() {
  const [productName, setProductName] = useState("");
  const [strength, setStrength] = useState("");
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [quantityKind, setQuantityKind] = useState<"UNIT" | "PACK">("UNIT");
  /** UNIT: total units. PACK: number of packs */
  const [quantity, setQuantity] = useState(1);
  const [unitsPerPack, setUnitsPerPack] = useState(10);
  const [maxPrice, setMaxPrice] = useState("");
  const [urgency, setUrgency] = useState<"LOW" | "NORMAL" | "HIGH" | "CRITICAL">("NORMAL");
  const [isSOS, setIsSOS] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) {
      toast.error("Enter product name");
      return;
    }
    if (quantityKind === "PACK" && unitsPerPack < 1) {
      toast.error("Enter how many units are in each pack");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wanted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          strength: strength.trim() || undefined,
          barcode: barcode.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          quantityKind,
          quantity,
          ...(quantityKind === "PACK" ? { unitsPerPack } : {}),
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          urgency,
          isSOS,
          notes: notes.trim().slice(0, 200) || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Failed to post");
        setLoading(false);
        return;
      }
      toast.success("Wanted request posted. Expires in 7 days.");
      setProductName("");
      setStrength("");
      setBarcode("");
      setImageUrl("");
      setQuantityKind("UNIT");
      setQuantity(1);
      setUnitsPerPack(10);
      setMaxPrice("");
      setIsSOS(false);
      setNotes("");
      window.location.reload();
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  const inputClass =
    "w-full max-w-xl px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";
  const labelClass = "block text-sm font-medium text-white/80 mb-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6 mb-8 space-y-4 max-w-xl"
    >
      <h2 className="font-heading font-semibold text-white">
        Post what you need
      </h2>
      <div>
        <label htmlFor="productName" className={labelClass}>
          Drug / product name *
        </label>
        <input
          id="productName"
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Ozempic, Panadol"
          required
        />
      </div>
      <div>
        <label htmlFor="strength" className={labelClass}>
          Strength (optional)
        </label>
        <input
          id="strength"
          type="text"
          value={strength}
          onChange={(e) => setStrength(e.target.value)}
          className={inputClass}
          placeholder="e.g. 1mg"
        />
      </div>
      <div>
        <label htmlFor="barcode" className={labelClass}>
          Barcode (optional)
        </label>
        <input
          id="barcode"
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className={inputClass}
          placeholder="e.g. 9300600000000"
        />
      </div>
      <div>
        <label className={labelClass}>Photo (optional)</label>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          {imageUrl && !shouldSkipImageLoadInProduction(imageUrl) ? (
            <div className="relative group">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/5 border border-[rgba(161,130,65,0.25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/90 text-white text-xs font-bold flex items-center justify-center hover:bg-red-500"
                aria-label="Remove photo"
              >
                ×
              </button>
            </div>
          ) : imageUrl && shouldSkipImageLoadInProduction(imageUrl) ? (
            <div className="flex flex-col gap-1 text-[11px] text-amber-400/90 max-w-[11rem]">
              <span>Local dev photo URL — won’t load in production.</span>
              <button type="button" onClick={() => setImageUrl("")} className="text-left underline hover:text-amber-300">
                Clear and re-upload
              </button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  const file = files[0];
                  if (!file.type.startsWith("image/")) return;
                  setUploading(true);
                  let url: string | undefined;
                  try {
                    const result = await uploader.uploadFiles("listingImages", { files: [file] });
                    url = getUrlFromResult(result[0] as { url?: string; file?: { url?: string } });
                  } catch {
                    // UploadThing failed; try fallback API
                  }
                  if (!url) {
                    try {
                      url = await uploadPhotoFallback(file);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Photo upload failed.");
                      setUploading(false);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      return;
                    }
                  }
                  if (url) setImageUrl(url);
                  setUploading(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  const file = files[0];
                  if (!file.type.startsWith("image/")) return;
                  setUploading(true);
                  let url: string | undefined;
                  try {
                    const result = await uploader.uploadFiles("listingImages", { files: [file] });
                    url = getUrlFromResult(result[0] as { url?: string; file?: { url?: string } });
                  } catch {
                    // UploadThing failed; try fallback API
                  }
                  if (!url) {
                    try {
                      url = await uploadPhotoFallback(file);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Photo upload failed.");
                      setUploading(false);
                      if (cameraInputRef.current) cameraInputRef.current.value = "";
                      return;
                    }
                  }
                  if (url) setImageUrl(url);
                  setUploading(false);
                  if (cameraInputRef.current) cameraInputRef.current.value = "";
                }}
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
            </>
          )}
          {uploading && (
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gold/50 flex items-center justify-center text-white/60 text-xs">
              Uploading…
            </div>
          )}
        </div>
      </div>
      <div>
        <span className={labelClass}>Quantity type *</span>
        <div className="flex flex-wrap gap-4 text-white/90 mt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="quantityKind"
              checked={quantityKind === "UNIT"}
              onChange={() => setQuantityKind("UNIT")}
              className="text-gold focus:ring-gold"
            />
            Individual units (e.g. tablets, ampoules)
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="quantityKind"
              checked={quantityKind === "PACK"}
              onChange={() => setQuantityKind("PACK")}
              className="text-gold focus:ring-gold"
            />
            By pack — say how many per pack
          </label>
        </div>
        <p className="text-xs text-white/50 mt-1">
          <strong>Units:</strong> total count (e.g. 25 tablets). <strong>Pack:</strong> e.g. 3 packs of 10.
        </p>
      </div>
      {quantityKind === "UNIT" ? (
        <div>
          <label htmlFor="quantity" className={labelClass}>
            How many units do you need? *
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
            className={inputClass}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="packCount" className={labelClass}>
              How many packs? *
            </label>
            <input
              id="packCount"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="unitsPerPack" className={labelClass}>
              Units in each pack *{" "}
            </label>
            <input
              id="unitsPerPack"
              type="number"
              min={1}
              value={unitsPerPack}
              onChange={(e) => setUnitsPerPack(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={inputClass}
              placeholder="e.g. 10"
            />
          </div>
          <p className="text-sm text-white/55 sm:col-span-2 -mt-2">
            = {quantity * unitsPerPack} units total needed
          </p>
        </div>
      )}
      <div>
        <label htmlFor="maxPrice" className={labelClass}>
          Max price per {quantityKind === "UNIT" ? "unit" : "pack"} ex GST (optional)
        </label>
        <input
          id="maxPrice"
          type="number"
          step="0.01"
          min="0"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className={inputClass}
          placeholder="0.00"
        />
      </div>
      <div>
        <label className={labelClass}>Urgency</label>
        <select
          value={urgency}
          onChange={(e) =>
            setUrgency(e.target.value as "LOW" | "NORMAL" | "HIGH" | "CRITICAL")
          }
          className={inputClass + " appearance-none cursor-pointer [&>option]:bg-[#0D1B2A]"}
        >
          {URGENCIES.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isSOS}
            onChange={(e) => setIsSOS(e.target.checked)}
            className="w-4 h-4 rounded border-red-500/50 bg-white/5 text-red-500 focus:ring-red-500/50"
          />
          <span className={`text-sm font-medium ${isSOS ? "text-red-400" : "text-white/80"}`}>
            🚨 SOS — Urgent for patients (hospital, nursing, etc.)
          </span>
        </label>
      </div>
      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes (optional, max 200 chars)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 200))}
          rows={2}
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2.5 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Posting…" : "Post wanted request"}
      </button>
    </form>
  );
}
