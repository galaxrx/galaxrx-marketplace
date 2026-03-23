"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

const TEMPLATE_URL = "/listings-bulk-template.csv";
const EXPECTED_HEADERS = [
  "barcode",
  "productName",
  "stockType",
  "quantity",
  "unitsPerPack",
  "price",
  "expiryDate",
];

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let val = "";
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') {
            val += '"';
            i++;
          } else break;
        } else {
          val += line[i];
          i++;
        }
      }
      out.push(val);
      if (line[i] === ",") i++;
    } else {
      const comma = line.indexOf(",", i);
      const v = comma === -1 ? line.slice(i) : line.slice(i, comma);
      out.push(v.trim());
      i = comma === -1 ? line.length : comma + 1;
    }
  }
  return out;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < lines.length; r++) {
    const vals = parseCSVLine(lines[r]);
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = vals[i] ?? "";
    });
    if (obj.productName?.trim() || obj.barcode?.trim()) rows.push(obj);
  }
  return rows;
}

function hasExpectedHeaders(text: string): boolean {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const header = parseCSVLine(firstLine);
  return EXPECTED_HEADERS.every((h) => header.includes(h));
}

function normalizeBarcodeInput(value: string): string {
  const raw = String(value ?? "").trim().replace(/^'+/, "").replace(/\s+/g, "");
  if (!raw) return "";
  const sci = raw.match(/^(\d+(?:\.\d+)?)e\+?(\d+)$/i);
  if (sci) {
    const mantissa = sci[1];
    const exponent = parseInt(sci[2], 10);
    if (Number.isFinite(exponent) && exponent >= 0) {
      const digits = mantissa.replace(".", "");
      const decimals = mantissa.includes(".") ? mantissa.length - mantissa.indexOf(".") - 1 : 0;
      const zerosToAdd = exponent - decimals;
      if (zerosToAdd >= 0) {
        return (digits + "0".repeat(zerosToAdd)).replace(/\D/g, "");
      }
      const cut = digits.length + zerosToAdd;
      if (cut > 0) return digits.slice(0, cut).replace(/\D/g, "");
    }
  }
  return raw.replace(/\D/g, "");
}

function validateRow(row: Record<string, string>): string[] {
  const errors: string[] = [];
  const barcode = normalizeBarcodeInput(String(row.barcode ?? ""));
  const productName = String(row.productName ?? "").trim();
  if (!barcode && !productName) {
    errors.push("barcode or productName is required");
  }

  const stockTypeRaw = String(row.stockType ?? "PACK").trim().toUpperCase();
  if (!["PACK", "QUANTITY"].includes(stockTypeRaw)) {
    errors.push("stockType must be PACK or QUANTITY");
  }

  const quantityRaw = parseInt(String(row.quantity ?? "1"), 10);
  const quantity = Number.isFinite(quantityRaw) ? quantityRaw : 0;
  if (quantity <= 0) {
    errors.push("quantity must be > 0");
  }

  const unitsPerPackRaw = parseInt(String(row.unitsPerPack ?? "1"), 10);
  const unitsPerPack = Number.isFinite(unitsPerPackRaw) ? unitsPerPackRaw : 0;
  if (stockTypeRaw !== "QUANTITY" && unitsPerPack <= 0) {
    errors.push("unitsPerPack must be > 0 for PACK");
  }

  const price = parseFloat(String(row.price ?? "0").replace(",", "."));
  if (!Number.isFinite(price) || price <= 0) {
    errors.push("price must be > 0");
  }

  const expiryRaw = String(row.expiryDate ?? "").trim();
  if (!expiryRaw) {
    errors.push("expiryDate is required");
  } else {
    const expiryDate = expiryRaw.includes("/") ? expiryRaw.split("/").reverse().join("-") : expiryRaw;
    const dt = new Date(expiryDate);
    if (isNaN(dt.getTime())) {
      errors.push("expiryDate must be YYYY-MM-DD");
    }
  }

  return errors;
}

function toBulkItem(row: Record<string, string>): Record<string, unknown> | null {
  if (validateRow(row).length > 0) return null;
  const barcode = normalizeBarcodeInput(String(row.barcode ?? ""));
  const productName = String(row.productName ?? "").trim();
  const stockTypeRaw = String(row.stockType ?? "PACK").trim().toUpperCase();
  const stockType = stockTypeRaw === "QUANTITY" ? "QUANTITY" : "PACK";
  const quantity = Math.max(1, parseInt(String(row.quantity ?? "1"), 10) || 1);
  const unitsPerPack = Math.max(1, parseInt(String(row.unitsPerPack ?? "1"), 10) || 1);
  const price = parseFloat(String(row.price ?? "0").replace(",", "."));
  const expiryRaw = String(row.expiryDate ?? "").trim();
  const expiryDate = expiryRaw.includes("/") ? expiryRaw.split("/").reverse().join("-") : expiryRaw;

  return {
    barcode: barcode || null,
    productName,
    stockType,
    quantity,
    unitsPerPack,
    price,
    expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  };
}

export default function BulkUploadHelper() {
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown>[] | null>(null);
  const [invalidRows, setInvalidRows] = useState<Array<{ rowNumber: number; reasons: string[] }>>([]);
  const [priceType, setPriceType] = useState<"FIXED" | "NEGOTIABLE">("NEGOTIABLE");
  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP_ONLY" | "LOCAL_COURIER" | "NATIONAL_SHIPPING">("NATIONAL_SHIPPING");
  const [deliveryFee, setDeliveryFee] = useState<string>("");
  const [stateRestriction, setStateRestriction] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClear = useCallback(() => {
    setFile(null);
    setParsed(null);
    setInvalidRows([]);
    setPriceType("NEGOTIABLE");
    setFulfillmentType("NATIONAL_SHIPPING");
    setDeliveryFee("");
    setStateRestriction("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setParsed(null);
    setInvalidRows([]);
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (!hasExpectedHeaders(text)) {
        toast.error(`Template mismatch. Required columns: ${EXPECTED_HEADERS.join(", ")}`);
      }
      const rows = parseCSV(text);
      const invalid: Array<{ rowNumber: number; reasons: string[] }> = [];
      const items: Record<string, unknown>[] = [];
      rows.forEach((row, idx) => {
        const reasons = validateRow(row);
        if (reasons.length > 0) {
          invalid.push({ rowNumber: idx + 2, reasons });
          return;
        }
        const item = toBulkItem(row);
        if (item) items.push(item);
      });
      setParsed(items);
      setInvalidRows(invalid);
      if (items.length === 0) toast.error("No valid rows. Check barcode/productName, stockType, quantity, price, expiryDate.");
      if (invalid.length > 0) {
        toast.error(`${invalid.length} row(s) have validation issues. See row preview below.`);
      }
    };
    reader.readAsText(f, "UTF-8");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!parsed?.length) return;
    const fee = deliveryFee.trim() === "" ? 0 : parseFloat(deliveryFee.replace(",", "."));
    if (Number.isNaN(fee) || fee < 0) {
      toast.error("Delivery fee must be a valid number");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/listings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: parsed,
          priceType,
          shipping: {
            fulfillmentType,
            deliveryFee: fee,
            stateRestriction: stateRestriction || null,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Bulk upload failed");
        setLoading(false);
        return;
      }
      toast.success(`${data.created} listing(s) created.`);
      setFile(null);
      setParsed(null);
      setPriceType("NEGOTIABLE");
      setFulfillmentType("NATIONAL_SHIPPING");
      setDeliveryFee("");
      setStateRestriction("");
    } catch {
      toast.error("Bulk upload failed");
    }
    setLoading(false);
  }, [parsed, priceType, fulfillmentType, deliveryFee, stateRestriction]);

  return (
    <aside className="w-72 xl:w-80 flex-shrink-0">
      <div className="sticky top-24 rounded-xl border border-[rgba(161,130,65,0.2)] bg-mid-navy/90 shadow-lg p-5">
        <h2 className="text-gold font-semibold text-sm uppercase tracking-wider mb-1">
          Bulk upload
        </h2>
        <p className="text-white/60 text-xs mb-4">
          List many items at once with a CSV file.
        </p>
        <a
          href={TEMPLATE_URL}
          download="GalaxRX_listings_template.csv"
          className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg border border-gold/40 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/20 transition mb-4"
        >
          📥 Download template
        </a>
        <details className="group text-white/50 text-xs mb-4">
          <summary className="cursor-pointer hover:text-white/70 list-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1">Template columns <span className="group-open:rotate-180 transition">▼</span></span>
          </summary>
          <p className="mt-2 pt-2 border-t border-white/10">
            barcode, productName (optional if barcode provided), stockType (PACK or QUANTITY), quantity (number of{" "}
            <strong className="text-white/60">packs</strong> when PACK, or <strong className="text-white/60">units</strong>{" "}
            when QUANTITY), unitsPerPack (required for PACK), price (per pack if PACK, per unit if QUANTITY), expiryDate
            (YYYY-MM-DD).
          </p>
        </details>
        <div className="flex gap-2 items-center">
          <label className="flex-1 min-w-0">
            <span className="sr-only">Upload CSV</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="block w-full text-xs text-white/60 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border file:border-gold/30 file:bg-gold/10 file:text-gold file:font-medium file:text-sm hover:file:bg-gold/20"
            />
          </label>
          {(file != null || (parsed != null && parsed.length > 0)) && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 py-2 px-3 rounded-lg border border-white/20 text-white/70 text-xs font-medium hover:bg-white/10 hover:text-white transition"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-[11px] text-white/50 mt-2">
          Tip: download the minimal template first, then paste your rows. Invalid row numbers will appear below before submit.
        </p>
        <p className="text-[11px] text-white/60 mt-1">
          Excel note: set barcode column to Text (or prefix barcode with &apos;) to avoid scientific notation like 9.78014E+12.
        </p>
        {invalidRows.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-2">
            <p className="text-[11px] text-amber-100 mb-1">
              Fix these rows before upload ({invalidRows.length}):
            </p>
            <ul className="max-h-28 overflow-auto space-y-1">
              {invalidRows.slice(0, 20).map((row) => (
                <li key={row.rowNumber} className="text-[11px] text-amber-200/90">
                  Row {row.rowNumber}: {row.reasons.join("; ")}
                </li>
              ))}
            </ul>
          </div>
        )}
        {parsed != null && parsed.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(161,130,65,0.2)]">
            <p className="text-white/80 text-sm mb-2">
              <strong>{parsed.length}</strong> item(s) ready to list.
            </p>
            <p className="text-white/60 text-xs mb-2">Price type for all rows</p>
            <div className="flex gap-4 mb-3 text-sm text-white/90">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="bulk-price-type"
                  checked={priceType === "FIXED"}
                  onChange={() => setPriceType("FIXED")}
                  className="text-gold focus:ring-gold"
                />
                Fixed
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="bulk-price-type"
                  checked={priceType === "NEGOTIABLE"}
                  onChange={() => setPriceType("NEGOTIABLE")}
                  className="text-gold focus:ring-gold"
                />
                Negotiable
              </label>
            </div>
            <p className="text-white/60 text-xs mb-2">Shipping (optional, applied to all rows)</p>
            <div className="grid grid-cols-1 gap-2 mb-3">
              <select
                value={fulfillmentType}
                onChange={(e) => setFulfillmentType(e.target.value as "PICKUP_ONLY" | "LOCAL_COURIER" | "NATIONAL_SHIPPING")}
                className="w-full px-2 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white text-xs"
              >
                <option value="PICKUP_ONLY">Pickup only</option>
                <option value="LOCAL_COURIER">Local courier</option>
                <option value="NATIONAL_SHIPPING">National shipping</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="Delivery fee (default 0)"
                className="w-full px-2 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white text-xs placeholder-white/40"
              />
              <input
                type="text"
                value={stateRestriction}
                onChange={(e) => setStateRestriction(e.target.value.toUpperCase().trim())}
                placeholder="State restriction (optional, e.g. NSW)"
                className="w-full px-2 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white text-xs placeholder-white/40"
              />
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] font-bold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Posting…" : `Post ${parsed.length} listings`}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
