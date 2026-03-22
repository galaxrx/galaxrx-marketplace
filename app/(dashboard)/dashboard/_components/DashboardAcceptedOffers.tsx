"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import ListingImage from "@/components/listings/ListingImage";

type AcceptedOffer = {
  id: string;
  proposedPricePerPack: number;
  status: string;
  updatedAt: string;
  listing: {
    id: string;
    productName: string;
    pricePerPack: number;
    quantityUnits: number;
    packSize: number;
    isActive: boolean;
    images: string[];
  };
};

export default function DashboardAcceptedOffers() {
  const [offers, setOffers] = useState<AcceptedOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/accepted-offers")
      .then((res) => res.json())
      .then((data) => {
        setOffers(Array.isArray(data) ? data : []);
      })
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
        <h2 className="font-heading font-semibold text-lg text-white mb-4">Payment — Accepted offers</h2>
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  if (offers.length === 0) {
    return null;
  }

  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
      <h2 className="font-heading font-semibold text-lg text-white mb-1">Payment — Accepted offers</h2>
      <p className="text-white/70 text-sm mb-4">
        Your offer was accepted. Complete checkout at the agreed price before the acceptance window ends — after that, the listing opens to others again.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((n) => {
          const imageUrl = n.listing.images?.length ? n.listing.images[0] : null;
          const inactive = n.listing.isActive === false;
          return (
            <div
              key={n.id}
              className={`border border-white/10 rounded-xl overflow-hidden bg-white/5 flex flex-col ${inactive ? "opacity-60 grayscale" : ""}`}
            >
              <div className="aspect-video relative bg-white/5">
                {imageUrl ? (
                  <ListingImage
                    src={imageUrl}
                    alt={n.listing.productName}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-white/95 font-medium line-clamp-2">{n.listing.productName}</p>
                <p className="text-lg font-bold text-gold mt-1">
                  Agreed: ${n.proposedPricePerPack.toFixed(2)}/pack
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  {n.listing.quantityUnits} unit{n.listing.quantityUnits !== 1 ? "s" : ""} listed
                  {n.listing.packSize > 1 ? ` (~${Math.floor(n.listing.quantityUnits / n.listing.packSize)} packs)` : ""} · Accepted{" "}
                  {format(new Date(n.updatedAt), "d MMM yyyy")}
                </p>
                {inactive ? (
                  <div className="mt-3 w-full text-center bg-white/10 text-white/70 py-2.5 rounded-lg font-medium text-sm border border-white/10">
                    Listing no longer active
                  </div>
                ) : (
                  <Link
                    href={`/listings/${n.listing.id}`}
                    className="mt-3 w-full text-center bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition"
                  >
                    Buy Now
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
