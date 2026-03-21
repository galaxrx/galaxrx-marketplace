"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

const DEBOUNCE_MS = 350;
const PHOTON_URL = "https://photon.komoot.io/api/";
// Australia bounding box (minLon, minLat, maxLon, maxLat) to prioritise Australian addresses
const AU_BBOX = "113.2,-44,154,-10";

export type AddressResult = {
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  latitude?: number;
  longitude?: number;
};

// Map full state names to Australian state codes
const STATE_MAP: Record<string, string> = {
  "new south wales": "NSW",
  "nsw": "NSW",
  "victoria": "VIC",
  "vic": "VIC",
  "queensland": "QLD",
  "qld": "QLD",
  "western australia": "WA",
  "wa": "WA",
  "south australia": "SA",
  "sa": "SA",
  "tasmania": "TAS",
  "tas": "TAS",
  "australian capital territory": "ACT",
  "act": "ACT",
  "northern territory": "NT",
  "nt": "NT",
};

function mapState(stateName: string): string {
  if (!stateName) return "NSW";
  const key = stateName.toLowerCase().trim();
  return STATE_MAP[key] ?? stateName.slice(0, 3).toUpperCase();
}

type PhotonFeature = {
  type: string;
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry: { coordinates: [number, number] }; // [lon, lat]
};

function parseFeature(f: PhotonFeature): AddressResult | null {
  const p = f.properties;
  const [lon, lat] = f.geometry?.coordinates ?? [];
  const street = [p.housenumber, p.street].filter(Boolean).join(" ").trim() || p.name || "";
  const suburb = p.city ?? p.name ?? "";
  const state = mapState(p.state ?? "");
  const postcode = p.postcode ?? "";
  if (!street && !suburb) return null;
  return {
    address: street || suburb,
    suburb,
    state: state || "NSW",
    postcode,
    latitude: lat,
    longitude: lon,
  };
}

type Props = {
  onSelect: (result: AddressResult) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  label?: string;
};

export default function AddressAutocomplete({
  onSelect,
  className = "",
  inputClassName = "",
  placeholder = "Start typing your address (street, suburb or postcode)",
  label = "Search address",
}: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: trimmed,
        limit: "8",
        bbox: AU_BBOX,
      });
      const res = await fetch(`${PHOTON_URL}?${params.toString()}`);
      const data = await res.json();
      const features: PhotonFeature[] = data.features ?? [];
      const results = features.map(parseFeature).filter((r): r is AddressResult => r != null);
      setSuggestions(results);
      setSelectedIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (result: AddressResult) => {
      onSelect(result);
      setQuery([result.address, result.suburb, result.state, result.postcode].filter(Boolean).join(", "));
      setSuggestions([]);
      setOpen(false);
    },
    [onSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === "Enter" && selectedIndex >= 0 && suggestions[selectedIndex]) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setSelectedIndex(-1);
    }
  };

  const inputClass =
    inputClassName ||
    "w-full px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";

  const listboxId = useId();

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium mb-1 text-white/80">{label}</label>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
        aria-autocomplete="list"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-xs">Searching…</span>
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-[rgba(161,130,65,0.3)] bg-mid-navy shadow-xl py-1"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.address}-${s.suburb}-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={`px-4 py-2.5 text-sm cursor-pointer ${
                i === selectedIndex ? "bg-gold/20 text-gold" : "text-white/90 hover:bg-white/10"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
            >
              <span className="font-medium">{s.address || "—"}</span>
              {(s.suburb || s.state || s.postcode) && (
                <span className="text-white/60 ml-1">
                  {[s.suburb, s.state, s.postcode].filter(Boolean).join(", ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-white/50 mt-1">
        Search by street, suburb or postcode. Select an address so we can find your location.
      </p>
    </div>
  );
}
