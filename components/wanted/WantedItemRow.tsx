"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { genUploader } from "uploadthing/client";
import type { OurFileRouter } from "@/lib/uploadthing";
import MakeOfferModal from "@/components/wanted/MakeOfferModal";
import PriceInsightPanel from "@/components/price-intelligence/PriceInsightPanel";

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
  const res = await fetch("/api/upload/listing-image", { method: "POST", body: formData });
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

type WantedItem = {
  id: string;
  productName: string;
  strength: string | null;
  barcode: string | null;
  imageUrl: string | null;
  quantityKind?: string | null;
  quantity: number;
  unitsPerPack?: number | null;
  maxPrice: number | null;
  urgency: string;
  isSOS?: boolean;
  notes: string | null;
  expiresAt: Date;
  pharmacy: { id: string; name: string; isVerified: boolean; state: string };
};

function offerSubtotal(o: Offer): number {
  if (o.pricePerUnit != null && o.pricePerUnit > 0) return o.quantity * o.pricePerUnit;
  return o.quantity * o.pricePerPack;
}

function offerSummary(o: Offer): string {
  if (o.pricePerUnit != null && o.pricePerUnit > 0) {
    return `${o.quantity} unit(s) @ $${o.pricePerUnit.toFixed(2)}/unit`;
  }
  return `${o.quantity} pack(s) @ $${o.pricePerPack.toFixed(2)}/pack`;
}

const urgencyStyles: Record<string, string> = {
  CRITICAL: "border-l-4 border-error bg-error/5",
  HIGH: "border-l-4 border-warning bg-warning/5",
  NORMAL: "",
  LOW: "opacity-80",
};

type Offer = {
  id: string;
  quantity: number;
  pricePerPack: number;
  pricePerUnit?: number | null;
  message: string | null;
  status: string;
  createdAt: string;
  seller: { id: string; name: string; isVerified: boolean; state: string };
};

export default function WantedItemRow({
  item,
  isOwner,
}: {
  item: WantedItem;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchOffers(silentRefetch = false) {
    const isToggle = !silentRefetch && offers.length > 0 && showOffers && !offersError;
    if (isToggle) {
      setShowOffers(false);
      return;
    }
    if (!silentRefetch) setShowOffers(true);
    setOffersLoading(true);
    setOffersError(null);
    try {
      const res = await fetch(`/api/wanted/${item.id}/offers`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.message === "string" ? data.message : "Failed to load offers";
        setOffers([]);
        setOffersError(msg);
        if (!silentRefetch) toast.error(msg);
        return;
      }
      setOffers(Array.isArray(data) ? data : []);
    } catch {
      setOffers([]);
      setOffersError("Could not load offers. Please try again.");
      if (!silentRefetch) toast.error("Failed to load offers");
    } finally {
      setOffersLoading(false);
    }
  }

  const pendingOffers = offers.filter((o) => o.status === "PENDING");
  const acceptedOffers = offers.filter((o) => o.status === "ACCEPTED");
  const declinedOffers = offers.filter((o) => o.status === "DECLINED");

  async function handleOfferAction(offerId: string, action: "accept" | "decline") {
    try {
      const res = await fetch(`/api/wanted/${item.id}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "Failed");
        return;
      }
      toast.success(action === "accept" ? "Offer accepted. You can now proceed to pay." : "Offer declined. The seller has been notified. You can still proceed at their price below.");
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: action === "accept" ? "ACCEPTED" : "DECLINED" } : o))
      );
      fetchOffers(true);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleProceedAtPrice(offerId: string) {
    try {
      const res = await fetch(`/api/wanted/${item.id}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "proceed" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "Failed");
        return;
      }
      toast.success("Offer accepted. Redirecting to payment…");
      router.push(`/wanted/offer/${offerId}/pay`);
    } catch {
      toast.error("Something went wrong");
    }
  }

  const [form, setForm] = useState({
    productName: item.productName,
    strength: item.strength ?? "",
    barcode: item.barcode ?? "",
    imageUrl: item.imageUrl ?? "",
    quantity: item.quantity,
    maxPrice: item.maxPrice != null ? String(item.maxPrice) : "",
    urgency: item.urgency as "LOW" | "NORMAL" | "HIGH" | "CRITICAL",
    isSOS: item.isSOS ?? false,
    notes: item.notes ?? "",
  });

  const inputClass =
    "w-full max-w-xl px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";
  const labelClass = "block text-sm font-medium text-white/80 mb-1";

  async function handleRemove() {
    if (!confirm("Remove this wanted request? It will no longer be visible to others.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/wanted/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Failed to remove");
        setLoading(false);
        return;
      }
      toast.success("Wanted request removed.");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/wanted/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: form.productName.trim(),
          strength: form.strength.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          imageUrl: form.imageUrl.trim() || undefined,
          quantity: form.quantity,
          maxPrice: form.maxPrice ? parseFloat(form.maxPrice) : undefined,
          urgency: form.urgency,
          isSOS: form.isSOS,
          notes: form.notes.trim().slice(0, 200) || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Failed to update");
        setLoading(false);
        return;
      }
      toast.success("Wanted request updated.");
      setEditing(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  if (editing) {
    return (
      <div className={`bg-mid-navy border rounded-xl p-4 shadow-lg ${item.isSOS ? "border-red-500/40 bg-red-950/20" : "border-[rgba(161,130,65,0.3)]"} ${urgencyStyles[item.urgency] ?? ""}`}>
        <form onSubmit={handleUpdate} className="space-y-3">
          <div>
            <label className={labelClass}>Product name *</label>
            <input
              value={form.productName}
              onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
              className={inputClass}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Strength</label>
              <input
                value={form.strength}
                onChange={(e) => setForm((f) => ({ ...f, strength: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Barcode</label>
              <input
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Photo</label>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {form.imageUrl ? (
                <div className="relative">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-[rgba(161,130,65,0.25)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/90 text-white text-xs font-bold"
                  >
                    ×
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
                      const file = e.target.files?.[0];
                      if (!file || !file.type.startsWith("image/")) return;
                      setUploading(true);
                      let url: string | undefined;
                      try {
                        const result = await uploader.uploadFiles("listingImages", { files: [file] });
                        url = getUrlFromResult(result[0] as { url?: string; file?: { url?: string } });
                      } catch {}
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
                      setForm((f) => ({ ...f, imageUrl: url ?? "" }));
                      setUploading(false);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-[rgba(161,130,65,0.4)] text-white/50 text-xs hover:border-gold/60 disabled:opacity-50"
                  >
                    {uploading ? "…" : "Upload"}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value, 10) || 1 }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Max price per pack</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={form.maxPrice}
                onChange={(e) => setForm((f) => ({ ...f, maxPrice: e.target.value }))}
                className={inputClass}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Urgency</label>
            <select
              value={form.urgency}
              onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value as typeof form.urgency }))}
              className={inputClass + " [&>option]:bg-[#0D1B2A]"}
            >
              {URGENCIES.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isSOS}
                onChange={(e) => setForm((f) => ({ ...f, isSOS: e.target.checked }))}
                className="w-4 h-4 rounded border-red-500/50 bg-white/5 text-red-500 focus:ring-red-500/50"
              />
              <span className={`text-sm font-medium ${form.isSOS ? "text-red-400" : "text-white/80"}`}>
                🚨 SOS — Urgent for patients
              </span>
            </label>
          </div>
          <div>
            <label className={labelClass}>Notes (max 200)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value.slice(0, 200) }))}
              rows={2}
              className={inputClass}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={loading}
              className="border border-[rgba(161,130,65,0.4)] text-white/80 px-4 py-2 rounded-lg text-sm hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  const isSOS = item.isSOS === true;
  return (
    <div className={`bg-mid-navy border rounded-xl p-4 shadow-lg hover:border-gold/40 transition ${isSOS ? "border-red-500/50 bg-red-950/20" : "border-[rgba(161,130,65,0.18)]"} ${urgencyStyles[item.urgency] ?? ""}`}>
      <div className="aspect-video bg-white/5 rounded-lg mb-3 overflow-hidden flex items-center justify-center text-white/40 text-sm border border-[rgba(161,130,65,0.15)] relative">
        {item.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
        ) : (
          <span>No image</span>
        )}
      </div>
      {isSOS && (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/20 border border-red-500/40 rounded-md px-2 py-0.5 w-fit mb-2">
          🚨 SOS
        </span>
      )}
      <h3 className="font-semibold text-white truncate">
        {item.productName}
        {item.strength ? ` · ${item.strength}` : ""}
      </h3>
      <p className="text-sm text-white/70">
        {item.quantityKind === "UNIT" ? (
          <>Needs: {item.quantity} units</>
        ) : (
          <>
            Needs: {item.quantity} pack{item.quantity !== 1 ? "s" : ""}
            {item.unitsPerPack != null && item.unitsPerPack >= 1
              ? ` × ${item.unitsPerPack} units/pack (= ${item.quantity * item.unitsPerPack} units)`
              : ""}
          </>
        )}
        {item.maxPrice != null &&
          ` · Max $${item.maxPrice.toFixed(2)}/${item.quantityKind === "UNIT" ? "unit" : "pack"}`}
      </p>
      <p className="text-xs text-white/50 mt-1">
        Expires {new Date(item.expiresAt).toLocaleDateString()}
      </p>
      {!isOwner ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MakeOfferModal
            item={{
              id: item.id,
              productName: item.productName,
              strength: item.strength,
              quantity: item.quantity,
              maxPrice: item.maxPrice,
              quantityKind: item.quantityKind ?? "PACK",
              unitsPerPack: item.unitsPerPack ?? null,
            }}
            triggerLabel="Make offer →"
          />
          <PriceInsightPanel
            productName={item.productName}
            currentPrice={item.maxPrice ?? 0}
            viewAs="seller"
            referencePrice={item.maxPrice}
          />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <Link
              href={`/wanted/${item.id}/matches`}
              className="text-gold font-medium hover:underline"
            >
              Find matching listings
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                fetchOffers();
              }}
              disabled={offersLoading}
              className="text-gold font-medium hover:underline disabled:opacity-50 cursor-pointer"
              aria-expanded={showOffers}
              aria-controls={`offers-panel-${item.id}`}
            >
              {offersLoading ? "…" : showOffers ? `Hide offers (${offers.length})` : "View offers"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={loading}
              className="text-gold font-medium hover:underline disabled:opacity-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={loading}
              className="text-error font-medium hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
      {isOwner && showOffers && (
        <div id={`offers-panel-${item.id}`} className="mt-4 pt-4 border-t border-[rgba(161,130,65,0.2)]" role="region" aria-label="Offers">
          {offersLoading && (
            <p className="text-white/60 text-sm mb-4">Loading offers…</p>
          )}
          {offersError && !offersLoading && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm">
              {offersError}
              <button
                type="button"
                onClick={() => fetchOffers(true)}
                className="ml-2 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}
          {!offersLoading && declinedOffers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-white/80 mb-2">Declined — you can still proceed at seller&apos;s price</p>
              <ul className="space-y-2">
                {declinedOffers.map((o) => (
                  <li key={o.id} className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm">
                    <p className="text-white/90">
                      <strong>{o.seller.name}</strong>
                      {o.seller.isVerified && " ✓"} · {o.seller.state}
                    </p>
                    <p className="text-white/70 mt-0.5">
                      {offerSummary(o)}
                      {o.message && ` · ${o.message}`}
                    </p>
                    <p className="text-white/50 text-xs mt-1">A message was sent to the seller when you declined. You can still buy at their offered price.</p>
                    <button
                      type="button"
                      onClick={() => handleProceedAtPrice(o.id)}
                      className="mt-2 text-sm font-medium bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-3 py-1.5 rounded-lg hover:opacity-90"
                    >
                      Proceed at offered price (${offerSubtotal(o).toFixed(2)})
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!offersLoading && acceptedOffers.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gold mb-2">Accepted — proceed to pay</p>
              <ul className="space-y-2">
                {acceptedOffers.map((o) => (
                  <li key={o.id} className="bg-success/10 border border-success/30 rounded-lg p-3 text-sm">
                    <p className="text-white/90">
                      <strong>{o.seller.name}</strong>
                      {o.seller.isVerified && " ✓"} · {o.seller.state}
                    </p>
                    <p className="text-white/70 mt-0.5">
                      {offerSummary(o)}
                      {o.message && ` · ${o.message}`}
                    </p>
                    <PriceInsightPanel
                      productName={item.productName}
                      currentPrice={o.pricePerUnit != null && o.pricePerUnit > 0 ? o.pricePerUnit : o.pricePerPack}
                      viewAs="buyer"
                      referencePrice={o.pricePerUnit != null && o.pricePerUnit > 0 ? o.pricePerUnit : o.pricePerPack}
                      className="mt-2"
                    />
                    <Link
                      href={`/wanted/offer/${o.id}/pay`}
                      className="inline-block mt-2 text-sm font-medium bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-3 py-1.5 rounded-lg hover:opacity-90"
                    >
                      Proceed to pay at ${offerSubtotal(o).toFixed(2)} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!offersLoading && (
            <>
              <p className="text-sm font-medium text-gold mb-2">Pending offers</p>
              {pendingOffers.length === 0 && acceptedOffers.length === 0 ? (
                <p className="text-sm text-white/60">No offers yet.</p>
              ) : pendingOffers.length === 0 ? (
                <p className="text-sm text-white/60">No pending offers.</p>
              ) : (
            <ul className="space-y-2">
              {pendingOffers.map((o) => (
                <li key={o.id} className="bg-white/5 rounded-lg p-3 text-sm">
                  <p className="text-white/90">
                    <strong>{o.seller.name}</strong>
                    {o.seller.isVerified && " ✓"} · {o.seller.state}
                  </p>
                  <p className="text-white/70 mt-0.5">
                    {offerSummary(o)}
                    {o.message && ` · ${o.message}`}
                  </p>
                  <PriceInsightPanel
                    productName={item.productName}
                    currentPrice={o.pricePerUnit != null && o.pricePerUnit > 0 ? o.pricePerUnit : o.pricePerPack}
                    viewAs="buyer"
                    referencePrice={o.pricePerUnit != null && o.pricePerUnit > 0 ? o.pricePerUnit : o.pricePerPack}
                    className="mt-2"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleOfferAction(o.id, "accept")}
                      className="text-xs bg-success/20 text-success px-2 py-1 rounded hover:bg-success/30"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOfferAction(o.id, "decline")}
                      className="text-xs bg-error/20 text-error px-2 py-1 rounded hover:bg-error/30"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
            </>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
