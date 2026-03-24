"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";

const BarcodeScanner = dynamic(
  () => import("@/components/sell/BarcodeScanner").then((m) => m.BarcodeScanner),
  { ssr: false }
);
const ListingPhotoUpload = dynamic(() => import("@/components/sell/ListingPhotoUpload"), {
  loading: () => (
    <div className="rounded-lg border border-[rgba(161,130,65,0.2)] bg-white/5 p-3 text-xs text-white/60">
      Loading photo upload...
    </div>
  ),
});
const BulkUploadHelper = dynamic(() => import("@/components/sell/BulkUploadHelper"), {
  loading: () => (
    <aside className="w-72 xl:w-80 flex-shrink-0">
      <div className="sticky top-24 rounded-xl border border-[rgba(161,130,65,0.2)] bg-mid-navy/90 shadow-lg p-5">
        <div className="h-5 w-28 rounded bg-white/10 animate-pulse mb-3" />
        <div className="h-20 rounded bg-white/5 animate-pulse" />
      </div>
    </aside>
  ),
});

import { CATEGORY_OPTIONS, type CategoryValue } from "@/lib/categories";
import { shouldSkipImageLoadInProduction } from "@/lib/image-url";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

type Drug = {
  id: string;
  productName: string;
  genericName: string | null;
  brand: string | null;
  strength: string | null;
  form: string | null;
  packSize: number | null;
  pbsCode: string | null;
  category: string;
  barcode?: string | null;
  imageUrl?: string | null;
  images?: string[];
};

type Props = {
  repeatId: string | null;
  editId: string | null;
};

export default function SellPageClient({ repeatId, editId }: Props) {
  const [tab, setTab] = useState<"search" | "barcode" | "manual">("search");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [manualProduct, setManualProduct] = useState({ productName: "", packSize: 20, category: "OTC" as CategoryValue });
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    stockType: "PACK" as "PACK" | "QUANTITY",
    packCount: 1,
    unitsPerPack: 1,
    totalUnits: 1,
    price: "",
    expiryMonth: new Date().getMonth() + 1,
    expiryYear: new Date().getFullYear(),
    /** FIXED = no offers; NEGOTIABLE = buyers can send offers. Mandatory. */
    priceType: "NEGOTIABLE" as "FIXED" | "NEGOTIABLE",
    originalRRP: null as number | null,
    condition: "SEALED" as "SEALED" | "OPENED",
    /** true = GST-free, false = taxable (10% GST). Required for checkout. */
    isGstFree: false,
    fulfillmentType: "NATIONAL_SHIPPING" as "PICKUP_ONLY" | "LOCAL_COURIER" | "NATIONAL_SHIPPING",
    deliveryFee: "" as string,
    stateRestriction: "" as string,
    description: "",
    noteToPurchasers: "",
    images: [] as string[],
  });
  const [publishedProduct, setPublishedProduct] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  /** When editing: listing has accepted offer(s) not yet paid (seller can clear to mark available again). */
  const [isPending, setIsPending] = useState(false);
  /** User opted to clear pending (cancel accepted offers) when saving edit. */
  const [clearPending, setClearPending] = useState(false);
  /** Snapshot when edit form loads — if unchanged on save, API only updates price/metadata (keeps quantity/reservations). */
  const editStockSnapshotRef = useRef<{
    stockType: "PACK" | "QUANTITY";
    packCount: number;
    unitsPerPack: number;
    totalUnits: number;
  } | null>(null);

  useEffect(() => {
    const id = repeatId || editId;
    if (!id) {
      editStockSnapshotRef.current = null;
      return;
    }
    let cancelled = false;
    fetch(`/api/listings/${id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((listing: { productName: string; genericName?: string | null; brand?: string | null; strength?: string | null; form?: string | null; packSize: number; quantityUnits: number; expiryDate: string; pricePerPack: number; priceType?: string; originalRRP?: number | null; condition: string; isGstFree?: boolean | null; fulfillmentType: string; deliveryFee?: number | null; stateRestriction?: string | null; description?: string | null; noteToPurchasers?: string | null; category: string; images?: string[]; isPending?: boolean } | null) => {
        if (cancelled || !listing) return;
        setIsPending(Boolean(listing.isPending));
        setClearPending(false);
        setSelectedDrug({
          id: "",
          productName: listing.productName,
          genericName: listing.genericName ?? null,
          brand: listing.brand ?? null,
          strength: listing.strength ?? null,
          form: listing.form ?? null,
          packSize: listing.packSize,
          pbsCode: null,
          category: listing.category,
        });
        const d = new Date(listing.expiryDate);
        const ps = listing.packSize;
        const qu = listing.quantityUnits;
        let stockType: "PACK" | "QUANTITY" = "PACK";
        let packCount = 1;
        let unitsPerPack = Math.max(1, ps);
        let totalUnits = qu;
        let priceStr = String(listing.pricePerPack);
        if (ps === 1) {
          stockType = "QUANTITY";
          totalUnits = qu;
          priceStr = String(listing.pricePerPack);
        } else if (qu % ps === 0) {
          stockType = "PACK";
          packCount = qu / ps;
          unitsPerPack = ps;
          priceStr = String(listing.pricePerPack);
        } else {
          stockType = "QUANTITY";
          totalUnits = qu;
          priceStr = (listing.pricePerPack / ps).toFixed(4).replace(/\.?0+$/, "");
        }
        editStockSnapshotRef.current = {
          stockType,
          packCount,
          unitsPerPack,
          totalUnits,
        };
        setForm((f) => ({
          ...f,
          stockType,
          packCount,
          unitsPerPack,
          totalUnits,
          price: priceStr,
          expiryMonth: d.getMonth() + 1,
          expiryYear: d.getFullYear(),
          priceType: (listing.priceType === "FIXED" ? "FIXED" : "NEGOTIABLE") as "FIXED" | "NEGOTIABLE",
          originalRRP: listing.originalRRP ?? null,
          condition: listing.condition === "OPENED" ? "OPENED" : "SEALED",
          isGstFree: listing.isGstFree ?? false,
          fulfillmentType: listing.fulfillmentType as "PICKUP_ONLY" | "LOCAL_COURIER" | "NATIONAL_SHIPPING",
          deliveryFee: listing.deliveryFee != null ? String(listing.deliveryFee) : "",
          stateRestriction: listing.stateRestriction ?? "",
          description: listing.description ?? "",
          noteToPurchasers: listing.noteToPurchasers ?? "",
          images: listing.images ?? [],
        }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [repeatId, editId]);

  const runSearch = useCallback(async () => {
    if (search.length < 2) return;
    const res = await fetch(`/api/drugs/search?q=${encodeURIComponent(search)}`);
    const data = await res.json();
    setSearchResults(Array.isArray(data) ? data : []);
  }, [search]);

  const handleSelectDrug = (drug: Drug) => {
    setSelectedDrug(drug);
    setSearchResults([]);
    setSearch("");
    const up = drug.packSize && drug.packSize >= 1 ? drug.packSize : 1;
    const fetchedImages = (
      Array.isArray(drug.images)
        ? drug.images
        : (typeof drug.imageUrl === "string" && drug.imageUrl.trim() ? [drug.imageUrl] : [])
    )
      .filter((img): img is string => typeof img === "string" && img.trim().length > 0)
      .slice(0, 6);
    setForm((f) => ({
      ...f,
      unitsPerPack: up,
      images: fetchedImages.length > 0 ? fetchedImages : f.images,
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDrug) {
      toast.error("Select a product first");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error(form.stockType === "PACK" ? "Enter a valid price per pack" : "Enter a valid price per unit");
      return;
    }
    if (form.stockType === "PACK") {
      if (form.packCount < 1 || form.unitsPerPack < 1) {
        toast.error("Enter pack count and units per pack");
        return;
      }
    } else if (form.totalUnits < 1) {
      toast.error("Enter how many units you have");
      return;
    }
    setLoading(true);
    try {
      const expiryDate = new Date(form.expiryYear, form.expiryMonth - 1, 1);
      if (editId) {
        const snap = editStockSnapshotRef.current;
        const stockUnchanged =
          snap != null &&
          form.stockType === snap.stockType &&
          (form.stockType === "PACK"
            ? form.packCount === snap.packCount && form.unitsPerPack === snap.unitsPerPack
            : form.totalUnits === snap.totalUnits);
        const editBody = stockUnchanged
          ? {
              preserveStock: true,
              stockType: form.stockType,
              ...(form.stockType === "PACK"
                ? { pricePerPack: price }
                : { pricePerUnit: price }),
              priceType: form.priceType,
              expiryDate: expiryDate.toISOString(),
              originalRRP: form.originalRRP ?? undefined,
              condition: form.condition,
              isGstFree: form.isGstFree,
              fulfillmentType: form.fulfillmentType,
              deliveryFee: form.deliveryFee !== "" ? parseFloat(form.deliveryFee) : 0,
              stateRestriction: form.stateRestriction || null,
              description: form.description || undefined,
              noteToPurchasers: form.noteToPurchasers || undefined,
              images: form.images,
              isActive: true,
              ...(clearPending ? { clearPending: true } : {}),
            }
          : {
              stockType: form.stockType,
              ...(form.stockType === "PACK"
                ? { packCount: form.packCount, unitsPerPack: form.unitsPerPack, pricePerPack: price }
                : { totalUnits: form.totalUnits, pricePerUnit: price }),
              priceType: form.priceType,
              expiryDate: expiryDate.toISOString(),
              originalRRP: form.originalRRP ?? undefined,
              condition: form.condition,
              isGstFree: form.isGstFree,
              fulfillmentType: form.fulfillmentType,
              deliveryFee: form.deliveryFee !== "" ? parseFloat(form.deliveryFee) : 0,
              stateRestriction: form.stateRestriction || null,
              description: form.description || undefined,
              noteToPurchasers: form.noteToPurchasers || undefined,
              images: form.images,
              isActive: true,
              ...(clearPending ? { clearPending: true } : {}),
            };
        const res = await fetch(`/api/listings/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editBody),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.message ?? "Failed to update listing");
          setLoading(false);
          return;
        }
        editStockSnapshotRef.current = {
          stockType: form.stockType,
          packCount: form.packCount,
          unitsPerPack: form.unitsPerPack,
          totalUnits: form.totalUnits,
        };
        setPublishedProduct(selectedDrug.productName);
        toast.success("Listing updated.");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugMasterId: selectedDrug.id,
          productName: selectedDrug.productName,
          genericName: selectedDrug.genericName,
          brand: selectedDrug.brand,
          strength: selectedDrug.strength,
          form: selectedDrug.form,
          stockType: form.stockType,
          ...(form.stockType === "PACK"
            ? { packCount: form.packCount, unitsPerPack: form.unitsPerPack, pricePerPack: price }
            : { totalUnits: form.totalUnits, pricePerUnit: price }),
          expiryDate: expiryDate.toISOString(),
          priceType: form.priceType,
          originalRRP: form.originalRRP ?? undefined,
          condition: form.condition,
          isGstFree: form.isGstFree,
          images: form.images,
          description: form.description || undefined,
          noteToPurchasers: form.noteToPurchasers || undefined,
          category: selectedDrug.category,
          fulfillmentType: form.fulfillmentType,
          deliveryFee: form.deliveryFee !== "" ? parseFloat(form.deliveryFee) : 0,
          stateRestriction: form.stateRestriction || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.message ?? "Failed to create listing";
        const detail = data.errors?.fieldErrors
          ? Object.entries(data.errors.fieldErrors).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map((e) => `${k}: ${e}`)).join(". ")
          : "";
        toast.error(detail ? `${msg} — ${detail}` : msg);
        setLoading(false);
        return;
      }
      setPublishedProduct(selectedDrug.productName);
      toast.success(`Listed! ${selectedDrug.productName} is now visible to verified pharmacies.`);
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  const expiryDate = new Date(form.expiryYear, form.expiryMonth - 1, 1);
  const isClearance = expiryDate.getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000;
  const rrpPerUnit =
    form.originalRRP != null && selectedDrug?.packSize
      ? form.originalRRP / Math.max(1, selectedDrug.packSize)
      : null;
  const discountPct =
    form.originalRRP && form.price
      ? form.stockType === "PACK"
        ? Math.round((1 - parseFloat(form.price) / form.originalRRP) * 100)
        : rrpPerUnit
          ? Math.round((1 - parseFloat(form.price) / rrpPerUnit) * 100)
          : null
      : null;

  const pricePreviewDisplay = (() => {
    const p = parseFloat(form.price);
    return Number.isFinite(p) && p >= 0 ? p.toFixed(2) : "…";
  })();

  const inputClass = "w-full max-w-2xl px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";
  const labelClass = "block text-sm font-medium text-white/80 mb-1";

  if (publishedProduct) {
    const wasEdit = !!editId;
    return (
      <div className="w-full max-w-none mx-auto text-center py-12">
        <h1 className="text-2xl font-heading font-bold text-gold mb-4">
          {wasEdit ? "Listing updated" : "Listing published"}
        </h1>
        <p className="text-white/70 mb-6">
          {wasEdit ? `${publishedProduct} has been updated.` : `${publishedProduct} is now visible to verified pharmacies.`}
          {!wasEdit && " It will appear under My listings and in your dashboard count."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!wasEdit && (
            <button
              type="button"
              onClick={() => { setPublishedProduct(null); setSelectedDrug(null); }}
              className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold hover:opacity-90"
            >
              List another
            </button>
          )}
          <Link
            href="/my-listings"
            className="border-2 border-gold/50 text-gold px-6 py-3 rounded-xl font-medium hover:bg-gold/10 inline-block"
          >
            View my listings
          </Link>
        </div>
      </div>
    );
  }

  const applyManualProduct = () => {
    const name = manualProduct.productName.trim();
    if (!name) {
      toast.error("Enter product name");
      return;
    }
    const up = Math.max(1, manualProduct.packSize);
    setSelectedDrug({
      id: "",
      productName: name,
      genericName: null,
      brand: null,
      strength: null,
      form: null,
      packSize: manualProduct.packSize,
      pbsCode: null,
      category: manualProduct.category,
    });
    setForm((f) => ({ ...f, unitsPerPack: up }));
    setTab("search");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-full items-start">
      <div className="min-w-0 w-full max-w-none">
        <h1 className="text-2xl font-heading font-bold text-gold mb-6">Sell stock</h1>
        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-white/5 border border-[rgba(161,130,65,0.15)] mb-5 w-fit">
          <button
            type="button"
            onClick={() => setTab("search")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition ${tab === "search" ? "bg-gold text-[#0D1B2A] shadow-sm" : "text-white/70 hover:text-white hover:bg-white/5"}`}
          >
            🔍 Search
          </button>
          <button
            type="button"
            onClick={() => setTab("barcode")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition ${tab === "barcode" ? "bg-gold text-[#0D1B2A] shadow-sm" : "text-white/70 hover:text-white hover:bg-white/5"}`}
          >
            📷 Barcode
          </button>
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition ${tab === "manual" ? "bg-gold text-[#0D1B2A] shadow-sm" : "text-white/70 hover:text-white hover:bg-white/5"}`}
          >
            ✏️ Manual
          </button>
        </div>
        {tab === "search" && (
          <div className="rounded-xl border border-[rgba(161,130,65,0.18)] bg-mid-navy/50 p-5 mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">Product name</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={runSearch}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="e.g. Panadol, Ventolin, Ozempic..."
              className="w-full px-4 py-2.5 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50"
            />
            {searchResults.length > 0 && (
              <ul className="mt-3 rounded-lg border border-[rgba(161,130,65,0.15)] bg-[#0D1B2A]/80 max-h-44 overflow-auto divide-y divide-white/5">
                {searchResults.map((d) => {
                  const thumbRaw =
                    (Array.isArray(d.images) && d.images[0]) || (typeof d.imageUrl === "string" ? d.imageUrl : "");
                  const thumb =
                    thumbRaw && !shouldSkipImageLoadInProduction(String(thumbRaw)) ? String(thumbRaw) : "";
                  return (
                  <li key={d.id || d.barcode || d.productName}>
                    <button
                      type="button"
                      onClick={() => handleSelectDrug(d)}
                      className="w-full text-left px-3 py-2.5 text-sm text-white/90 hover:bg-white/5 rounded flex items-start gap-3"
                    >
                      {thumb ? (
                        <span className="w-10 h-10 rounded border border-white/10 overflow-hidden bg-white/5 shrink-0 mt-0.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumb} alt="" className="w-full h-full object-cover" />
                        </span>
                      ) : (
                        <span className="w-10 h-10 rounded border border-white/10 bg-white/[0.03] shrink-0 mt-0.5" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate">
                          {d.productName} {d.strength && `· ${d.strength}`} {d.packSize && `· ${d.packSize} pack`}
                        </span>
                        {d.barcode && (
                          <span className="block text-[11px] text-white/45 mt-0.5">
                            Barcode: {d.barcode}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
            <p className="text-white/40 text-xs mt-3">Not found? Switch to <strong className="text-white/60">Manual</strong>.</p>
          </div>
        )}
      {tab === "manual" && (
        <div className="mb-6 bg-mid-navy border border-[rgba(161,130,65,0.25)] rounded-xl p-4 space-y-4">
          <p className="text-white/80 text-sm">
            Enter the product you want to list. On the next step you&apos;ll choose <strong className="text-white/90">sell by
            pack</strong> or <strong className="text-white/90">sell by unit</strong>, then enter how many packs or units and
            your price (per pack or per unit).
          </p>
          <div>
            <label className={labelClass}>Product name *</label>
            <input
              type="text"
              value={manualProduct.productName}
              onChange={(e) => setManualProduct((p) => ({ ...p, productName: e.target.value }))}
              placeholder="e.g. Paracetamol 500mg Tablets"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Reference pack size (units)</label>
            <input
              type="number"
              min={1}
              value={manualProduct.packSize}
              onChange={(e) => setManualProduct((p) => ({ ...p, packSize: parseInt(e.target.value, 10) || 1 }))}
              className={inputClass}
            />
            <p className="text-white/45 text-xs mt-1">
              Pre-fills &quot;units per pack&quot; when you sell by pack. If you sell by unit on the next step, you&apos;ll
              still enter the actual unit count separately.
            </p>
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={manualProduct.category}
              onChange={(e) => setManualProduct((p) => ({ ...p, category: e.target.value as CategoryValue }))}
              className={inputClass + " [&>option]:bg-[#0D1B2A]"}
            >
              {CATEGORY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={applyManualProduct}
            className="px-4 py-2.5 bg-gold text-[#0D1B2A] rounded-lg font-medium hover:bg-gold/90"
          >
            Next → Packs / units & price
          </button>
        </div>
      )}
      {tab === "barcode" && (
        <div className="mb-6">
          <p className="text-white/60 text-sm mb-2">Scan the product barcode to find it in the catalog. If it&apos;s not in the database, use Search by name instead.</p>
          <BarcodeScanner
            onScan={async (barcode) => {
              try {
                const res = await fetch(`/api/drugs/barcode/${encodeURIComponent(barcode)}`);
                const data = await res.json();
                if (data && data.productName) {
                  const nextPackSize = data.packSize && data.packSize >= 1 ? data.packSize : 1;
                  const fetchedImages = (
                    Array.isArray(data.images)
                      ? data.images
                      : (typeof data.imageUrl === "string" && data.imageUrl.trim() ? [data.imageUrl] : [])
                  )
                    .filter((img: unknown): img is string => typeof img === "string" && img.trim().length > 0)
                    .slice(0, 6);
                  setSelectedDrug({
                    id: data.id ?? "",
                    productName: data.productName,
                    genericName: data.genericName ?? null,
                    brand: data.brand ?? null,
                    strength: data.strength ?? null,
                    form: data.form ?? null,
                    packSize: data.packSize ?? null,
                    pbsCode: data.pbsCode ?? null,
                    category: data.category ?? "OTHER",
                  });
                  setForm((f) => ({
                    ...f,
                    unitsPerPack: nextPackSize,
                    images: fetchedImages.length > 0 ? fetchedImages : f.images,
                  }));
                  if (fetchedImages.length === 0) {
                    toast.message("Product found, but no image returned for this barcode.");
                  }
                  toast.success("✓ Product recognised");
                  setTab("search");
                } else {
                  toast.error("Product not in database. Search by name instead.");
                  setTab("search");
                }
              } catch {
                toast.error("Product not in database. Search by name instead.");
                setTab("search");
              }
            }}
            onError={(msg) => toast.error(msg)}
          />
        </div>
      )}
      {selectedDrug && (
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.25)] rounded-xl p-4 mb-6">
          <p className="font-semibold text-gold">✓ {selectedDrug.productName}</p>
          <p className="text-sm text-white/70">
            {[selectedDrug.brand, selectedDrug.strength, `${selectedDrug.packSize} pack`, selectedDrug.category].filter(Boolean).join(" · ")}
          </p>
          <button
            type="button"
            onClick={() => setSelectedDrug(null)}
            className="text-sm text-gold mt-2 hover:underline"
          >
            Change product
          </button>
        </div>
      )}
      {selectedDrug && (
        <form onSubmit={handleSubmit} className="space-y-4 bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6">
          <p className="text-white/60 text-sm -mt-1 mb-1">How are you listing stock?</p>
          <p className="text-xs text-white mb-3">
            Choose one. Next, we&apos;ll ask <strong className="text-white">how many packs</strong> or{" "}
            <strong className="text-white">how many units</strong> — that total is what buyers can purchase from this
            listing.
          </p>
          <p className="text-xs text-white bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 mb-4 dark:bg-amber-500/10 dark:border-amber-500/25">
            <strong className="text-white">Buyer limit:</strong> buyers cannot purchase more than the total you list
            here (units still in stock after other sales/reservations). If they try a higher quantity, they&apos;ll see a
            clear &quot;not available&quot; message.
          </p>
          <div className="flex flex-wrap gap-6 text-white mb-4">
            <label className="flex items-start gap-2 cursor-pointer max-w-md">
              <input
                type="radio"
                name="stockType"
                checked={form.stockType === "PACK"}
                onChange={() => setForm((f) => ({ ...f, stockType: "PACK" }))}
                className="text-gold focus:ring-gold mt-1"
              />
              <span>
                <span className="block font-medium text-white">Sell by full pack</span>
                <span className="block text-sm text-white mt-0.5">
                  You count <strong className="text-white">how many sealed packs</strong> you have. Your price is{" "}
                  <strong className="text-white">per pack</strong> (one price for the whole pack).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer max-w-md">
              <input
                type="radio"
                name="stockType"
                checked={form.stockType === "QUANTITY"}
                onChange={() => setForm((f) => ({ ...f, stockType: "QUANTITY" }))}
                className="text-gold focus:ring-gold mt-1"
              />
              <span>
                <span className="block font-medium text-white">Sell by unit</span>
                <span className="block text-sm text-white mt-0.5">
                  You count <strong className="text-white">how many individual units</strong> (e.g. tablets) buyers can
                  buy. Your price is <strong className="text-white">per unit</strong>.
                </span>
              </span>
            </label>
          </div>

          {form.stockType === "PACK" ? (
            <div
              className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5 mb-4 text-sm text-sky-900 dark:border-sky-500/35 dark:bg-sky-500/10 dark:text-sky-100/95"
              role="status"
            >
              <strong className="text-sky-950 dark:text-sky-50">Reminder:</strong> you are listing{" "}
              <strong className="text-slate-900 dark:text-white">full sealed packs</strong>. Enter how many packs below, then your{" "}
              <strong className="text-slate-900 dark:text-white">price per pack</strong> (ex GST). Buyers will see both pack price and how
              much stock is available in units and packs.
            </div>
          ) : (
            <div
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 mb-4 text-sm text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-100/95"
              role="status"
            >
              <strong className="text-emerald-950 dark:text-emerald-50">Reminder:</strong> you are listing{" "}
              <strong className="text-slate-900 dark:text-white">individual units</strong>, not packs. Enter how many units below, then your{" "}
              <strong className="text-slate-900 dark:text-white">price per unit</strong> (ex GST). Buyers will see how many units they can buy
              and the price per unit.
            </div>
          )}

          {form.stockType === "PACK" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
              <div>
                <label className={labelClass}>How many packs? *</label>
                <input
                  type="number"
                  min={1}
                  value={form.packCount}
                  onChange={(e) => setForm((f) => ({ ...f, packCount: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  className={inputClass}
                  aria-describedby="sell-pack-count-hint"
                />
                <p id="sell-pack-count-hint" className="text-white/45 text-xs mt-1">
                  Number of complete packs you are selling (each pack is charged at your pack price).
                </p>
              </div>
              <div>
                <label className={labelClass}>Units per pack *</label>
                <input
                  type="number"
                  min={1}
                  value={form.unitsPerPack}
                  onChange={(e) => setForm((f) => ({ ...f, unitsPerPack: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  className={inputClass}
                  aria-describedby="sell-units-per-pack-hint"
                />
                <p id="sell-units-per-pack-hint" className="text-white/45 text-xs mt-1">
                  Units in one sealed pack (e.g. 60). Buyers use this to understand pack size.
                </p>
              </div>
              <div>
                <label className={labelClass}>Price per pack (ex GST) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, price: v }));
                  }}
                  placeholder="0.00"
                  className={inputClass}
                  aria-describedby="sell-price-pack-hint"
                />
                <p id="sell-price-pack-hint" className="text-white/45 text-xs mt-1">
                  Buyers pay this for <strong className="text-white/60">one full pack</strong>, before GST.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <div>
                <label className={labelClass}>How many units? *</label>
                <input
                  type="number"
                  min={1}
                  value={form.totalUnits}
                  onChange={(e) => setForm((f) => ({ ...f, totalUnits: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                  className={inputClass}
                  aria-describedby="sell-total-units-hint"
                />
                <p id="sell-total-units-hint" className="text-white/45 text-xs mt-1">
                  Total individual units available (e.g. loose stock). This is the maximum buyers can purchase.
                </p>
              </div>
              <div>
                <label className={labelClass}>Price per unit (ex GST) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, price: v }));
                  }}
                  placeholder="0.00"
                  className={inputClass}
                  aria-describedby="sell-price-unit-hint"
                />
                <p id="sell-price-unit-hint" className="text-white/45 text-xs mt-1">
                  Buyers pay this for <strong className="text-white/60">each single unit</strong>, before GST.
                </p>
              </div>
            </div>
          )}
          {form.stockType === "PACK" && form.packCount >= 1 && form.unitsPerPack >= 1 && (
            <div className="rounded-lg border border-[rgba(201,168,76,0.25)] bg-white/[0.04] px-3 py-2.5 mb-4 text-sm text-white/75">
              <p className="font-medium text-gold/95 mb-1">What buyers will see</p>
              <p>
                <strong className="text-white">{form.packCount}</strong> pack{form.packCount !== 1 ? "s" : ""} ×{" "}
                <strong className="text-white">{form.unitsPerPack}</strong> units ={" "}
                <strong className="text-white">{form.packCount * form.unitsPerPack}</strong> units available. Listed price:{" "}
                <strong className="text-white">${pricePreviewDisplay}</strong>{" "}
                <span className="text-white/60">per pack (ex GST)</span>. They can buy by unit or by full pack where the
                listing allows.
              </p>
            </div>
          )}
          {form.stockType === "QUANTITY" && form.totalUnits >= 1 && (
            <div className="rounded-lg border border-[rgba(201,168,76,0.25)] bg-white/[0.04] px-3 py-2.5 mb-4 text-sm text-white/75">
              <p className="font-medium text-gold/95 mb-1">What buyers will see</p>
              <p>
                <strong className="text-white">{form.totalUnits}</strong> unit{form.totalUnits !== 1 ? "s" : ""} available
                to buy. Listed price:{" "}
                <strong className="text-white">${pricePreviewDisplay}</strong>{" "}
                <span className="text-white/60">per unit (ex GST)</span>.
              </p>
            </div>
          )}
          {form.originalRRP != null && form.price && discountPct != null && (
            <p className="text-sm text-white/60 mb-4">
              💡{" "}
              {form.stockType === "PACK" ? (
                <>
                  Reference RRP (per pack): ${form.originalRRP.toFixed(2)} · Your discount vs that RRP: {discountPct}%
                </>
              ) : rrpPerUnit != null ? (
                <>
                  Reference RRP per unit (from catalog pack size): ${rrpPerUnit.toFixed(4).replace(/\.?0+$/, "")} · Your
                  discount vs that reference: {discountPct}%
                </>
              ) : (
                <>Your discount vs reference RRP: {discountPct}%</>
              )}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Expiry month</label>
              <select
                value={form.expiryMonth}
                onChange={(e) => setForm((f) => ({ ...f, expiryMonth: parseInt(e.target.value, 10) }))}
                className={inputClass + " [&>option]:bg-[#0D1B2A]"}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString("default", { month: "long" })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Expiry year</label>
              <select
                value={form.expiryYear}
                onChange={(e) => setForm((f) => ({ ...f, expiryYear: parseInt(e.target.value, 10) }))}
                className={inputClass + " [&>option]:bg-[#0D1B2A]"}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Price type *</label>
            <div className="flex gap-4 text-white/90">
              <label className="flex items-center gap-2">
                <input type="radio" name="priceType" checked={form.priceType === "FIXED"} onChange={() => setForm((f) => ({ ...f, priceType: "FIXED" }))} className="text-gold focus:ring-gold" />
                Fixed — no offers; buyers pay listed price only
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="priceType" checked={form.priceType === "NEGOTIABLE"} onChange={() => setForm((f) => ({ ...f, priceType: "NEGOTIABLE" }))} className="text-gold focus:ring-gold" />
                Negotiable — buyers can send price offers
              </label>
            </div>
            <p className="text-xs text-white/50 mt-1">Choose whether buyers can propose a different price (Negotiate with Seller) or must pay the listed price.</p>
          </div>
          <div>
            <label className={labelClass}>Condition</label>
            <div className="flex gap-4 text-white/90">
              <label className="flex items-center gap-2"><input type="radio" name="condition" checked={form.condition === "SEALED"} onChange={() => setForm((f) => ({ ...f, condition: "SEALED" }))} className="text-gold focus:ring-gold" /> Sealed</label>
              <label className="flex items-center gap-2"><input type="radio" name="condition" checked={form.condition === "OPENED"} onChange={() => setForm((f) => ({ ...f, condition: "OPENED" }))} className="text-gold focus:ring-gold" /> Opened</label>
            </div>
          </div>
          <div>
            <label className={labelClass}>GST status *</label>
            <div className="flex gap-4 text-white/90">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="isGstFree"
                  checked={!form.isGstFree}
                  onChange={() => setForm((f) => ({ ...f, isGstFree: false }))}
                  className="text-gold focus:ring-gold"
                />
                Taxable (10% GST)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="isGstFree"
                  checked={form.isGstFree}
                  onChange={() => setForm((f) => ({ ...f, isGstFree: true }))}
                  className="text-gold focus:ring-gold"
                />
                GST-free
              </label>
            </div>
            <p className="text-xs text-white/50 mt-1">Required so buyers can complete checkout. Choose based on the product type (e.g. many OTC medicines are GST-free; supplements/cosmetics are taxable).</p>
          </div>
          <ListingPhotoUpload
            images={form.images}
            onChange={(urls) => setForm((f) => ({ ...f, images: urls }))}
            disabled={loading}
            labelClass={labelClass}
          />
          <div>
            <label className={labelClass}>Delivery option</label>
            <select
              value={form.fulfillmentType}
              onChange={(e) => setForm((f) => ({ ...f, fulfillmentType: e.target.value as typeof form.fulfillmentType }))}
              className={inputClass + " [&>option]:bg-[#0D1B2A]"}
            >
              <option value="PICKUP_ONLY">Pickup only — buyer collects from you</option>
              <option value="LOCAL_COURIER">Local courier — you arrange regional delivery</option>
              <option value="NATIONAL_SHIPPING">National shipping — ship Australia-wide</option>
            </select>
            <p className="text-xs text-white/50 mt-1">
              {form.fulfillmentType === "PICKUP_ONLY" && "Buyer collects from your pharmacy. No shipping."}
              {form.fulfillmentType === "LOCAL_COURIER" && "You arrange courier (e.g. same city/region)."}
              {form.fulfillmentType === "NATIONAL_SHIPPING" && "You ship to the buyer Australia-wide."}
            </p>
          </div>
          <div>
            <label className={labelClass}>Delivery fee (ex GST, optional)</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.deliveryFee}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*\.?\d*$/.test(v)) setForm((f) => ({ ...f, deliveryFee: v }));
              }}
              className={inputClass}
              placeholder="0.00"
            />
            <p className="text-xs text-white/50 mt-1">Added to buyer&apos;s total at checkout. Leave 0 for free delivery.</p>
          </div>
          <div>
            <label className={labelClass}>State restriction (optional)</label>
            <select
              value={form.stateRestriction}
              onChange={(e) => setForm((f) => ({ ...f, stateRestriction: e.target.value }))}
              className={inputClass + " [&>option]:bg-[#0D1B2A]"}
            >
              <option value="">All states</option>
              {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Description / Comments (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Note to Purchasers (optional)</label>
            <textarea
              value={form.noteToPurchasers}
              onChange={(e) => setForm((f) => ({ ...f, noteToPurchasers: e.target.value }))}
              rows={2}
              className={inputClass}
              placeholder="Message shown to buyers at checkout"
            />
          </div>
          {isClearance && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
              ℹ️ This listing will appear on the Expiry Clearance Board.
            </div>
          )}
          {editId && isPending && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <input
                type="checkbox"
                id="clear-pending"
                checked={clearPending}
                onChange={(e) => setClearPending(e.target.checked)}
                className="mt-1 rounded border-amber-500/50 bg-white/5 text-gold focus:ring-gold"
              />
              <label htmlFor="clear-pending" className="text-sm text-white/90 cursor-pointer">
                <span className="font-medium text-amber-400">Mark as available again</span>
                <span className="block text-white/70 mt-0.5">Cancel accepted offer(s) that haven’t been paid so this listing is no longer pending. The buyer(s) will need to send a new offer if they still want to buy.</span>
              </label>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (editId ? "Updating…" : "Publishing…") : (editId ? "Update listing" : "Publish listing")}
          </button>
        </form>
      )}
      </div>
      <div className="w-full">
        {!showBulkUpload ? (
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="lg:sticky lg:top-24 w-full rounded-xl border border-[rgba(161,130,65,0.2)] bg-mid-navy/90 px-4 py-3 text-left text-sm text-white/80 hover:bg-white/[0.04]"
          >
            Open bulk upload tools
          </button>
        ) : (
          <BulkUploadHelper />
        )}
      </div>
    </div>
  );
}
