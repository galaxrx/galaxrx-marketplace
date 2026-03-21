"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";
import { getDistance } from "geolib";
import ListingCard from "@/components/listings/ListingCard";

type PharmacyWithCoords = {
  name: string;
  rating: number;
  reviewCount: number;
  tradeCount: number;
  isVerified?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

type ListingWithPharmacy = {
  id: string;
  productName: string;
  strength: string | null;
  form: string | null;
  packSize: number;
  condition: string;
  expiryDate: Date | string;
  pricePerPack: number;
  originalRRP: number | null;
  quantityUnits: number;
  availableUnits?: number;
  images: string[];
  pharmacy: PharmacyWithCoords;
  isPending?: boolean;
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m away`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

export default function ListingsGridWithDistance({
  listings,
  compactImages = false,
}: {
  listings: ListingWithPharmacy[];
  /** Use smaller product thumbnails (Buy Items page) */
  compactImages?: boolean;
}) {
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationDenied, setLocationDenied] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    setLocationDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocationLoading(false);
      },
      () => {
        setLocationDenied(true);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationLoading(false);
      return;
    }
    requestLocation();
  }, [requestLocation]);

  return (
    <>
      {locationLoading && (
        <p className="text-sm text-white/60 mb-2">Getting your location to show distances…</p>
      )}
      {!locationLoading && locationDenied && !userCoords && (
        <div className="mb-4 p-3 rounded-lg bg-gold/10 border border-gold/30 flex flex-wrap items-center gap-3">
          <span className="text-sm text-gold">Allow location to see how far each seller is from you.</span>
          <button
            type="button"
            onClick={requestLocation}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gold text-[#0D1B2A] hover:opacity-90"
          >
            Use my location
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {listings.map((listing) => {
          let distanceText: string | undefined;
          const ph = listing.pharmacy as PharmacyWithCoords;
          const lat = ph?.latitude != null ? Number(ph.latitude) : NaN;
          const lng = ph?.longitude != null ? Number(ph.longitude) : NaN;
          const hasPharmacyCoords = !isNaN(lat) && !isNaN(lng);

          if (userCoords) {
            if (hasPharmacyCoords) {
              const meters = getDistance(userCoords, { latitude: lat, longitude: lng });
              distanceText = formatDistance(meters);
            } else {
              distanceText = "Distance unavailable";
            }
          }

          return (
            <ListingCard
              key={listing.id}
              listing={listing as ComponentProps<typeof ListingCard>["listing"]}
              distanceText={distanceText}
              compactImage={compactImages}
            />
          );
        })}
      </div>
    </>
  );
}
