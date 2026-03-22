"use client";

import Link from "next/link";
import { differenceInDays, format } from "date-fns";
import ListingImage from "@/components/listings/ListingImage";
import StarRating from "@/components/ui/StarRating";
import PriceInsightPanel from "@/components/price-intelligence/PriceInsightPanel";
import {
  listingBuyerAvailabilityLine,
  listingPackContextLine,
  listingPrimaryPriceExGstLabel,
  listingSecondaryPriceExGstLine,
  listingUnitPriceExGst,
} from "@/lib/listing-price-display";

type Listing = {
  id: string;
  productName: string;
  strength: string | null;
  form: string | null;
  packSize: number;
  condition: string;
  expiryDate: Date;
  pricePerPack: number;
  priceType?: string;
  originalRRP: number | null;
  quantityUnits: number;
  availableUnits?: number;
  images: string[];
  pharmacy: { name: string; rating: number; reviewCount: number; tradeCount: number; isVerified?: boolean };
  /** True when seller has accepted a buyer's offer and the item is pending payment */
  isPending?: boolean;
};

type ListingCardProps = {
  listing: Listing;
  distanceText?: string;
  /** Smaller thumbnail (e.g. Buy Items grid) */
  compactImage?: boolean;
};

function ExpiryBadge({ date }: { date: Date }) {
  const days = differenceInDays(date, new Date());
  let bg = "bg-success/20 text-success";
  if (days < 30) bg = "bg-error/20 text-error";
  else if (days < 60) bg = "bg-warning/20 text-warning";
  else if (days < 90) bg = "bg-warning/10 text-warning";
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${bg}`}>
      Exp: {format(date, "MMM yyyy")} ({days > 0 ? `${days}d` : "expired"})
    </span>
  );
}

export default function ListingCard({ listing, distanceText, compactImage }: ListingCardProps) {
  const discount = listing.originalRRP
    ? Math.round((1 - listing.pricePerPack / listing.originalRRP) * 100)
    : null;
  const firstImage = listing.images?.length ? listing.images[0] : null;
  const daysUntilExpiry = differenceInDays(new Date(listing.expiryDate), new Date());
  const avail = listing.availableUnits ?? listing.quantityUnits;
  const totalListed = listing.quantityUnits;
  const reservedUnits = Math.max(0, totalListed - avail);
  const lowStock = avail > 0 && avail < totalListed;
  const soldOut = avail <= 0;
  const secondaryPriceLine = listingSecondaryPriceExGstLine(listing.pricePerPack, listing.packSize);
  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4 hover:border-gold/40 transition shadow-lg flex flex-col">
      <Link href={`/listings/${listing.id}`} className="block flex-1 min-h-0">
        <div
          className={
            compactImage
              ? "h-20 sm:h-24 mb-2 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center text-white/40 text-xs border border-[rgba(161,130,65,0.15)] relative"
              : "aspect-video mb-3 bg-white/5 rounded-lg overflow-hidden flex items-center justify-center text-white/40 text-sm border border-[rgba(161,130,65,0.15)] relative"
          }
        >
          {firstImage ? (
            <ListingImage
              src={firstImage}
              alt={listing.productName}
              fill
              className="object-contain"
              compact={compactImage}
              sizes={
                compactImage
                  ? "(max-width: 640px) 90vw, 200px"
                  : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              }
            />
          ) : (
            <span>No image</span>
          )}
        </div>
        <h3 className="font-semibold text-white truncate">{listing.productName}</h3>
        <p className="text-sm text-white/70">{listingPackContextLine(listing.packSize, listing.condition)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <ExpiryBadge date={new Date(listing.expiryDate)} />
          {listing.isPending && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30" title="Seller has accepted an offer; payment pending">
              Pending
            </span>
          )}
          {soldOut && (
            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/20" title="No units available right now">
              Unavailable
            </span>
          )}
          {!soldOut && lowStock && (
            <span className="text-xs px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30" title="Some stock is held in active checkouts">
              Limited
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-bold text-gold">{listingPrimaryPriceExGstLabel(listing.pricePerPack, listing.packSize)}</p>
        {secondaryPriceLine && <p className="text-xs text-white/55">{secondaryPriceLine}</p>}
        <p className="text-xs text-white/55">
          {listingBuyerAvailabilityLine(avail, listing.packSize, {
            listedTotal: totalListed,
            reservedUnits,
          })}
        </p>
        {listing.priceType === "NEGOTIABLE" && (
          <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30" title="Price is negotiable — you can send an offer">
            <span className="relative flex h-2 w-3.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-pulse" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ml-0.5" />
            </span>
            Negotiable
          </span>
        )}
        {discount != null && (
          <p className="text-sm text-white/60">
            <span className="line-through">{listing.originalRRP != null && `$${listing.originalRRP.toFixed(2)}`}</span> -{discount}%
          </p>
        )}
        <p className="text-xs text-white/60 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>{listing.pharmacy.name}</span>
          {listing.pharmacy.isVerified && <span>✓</span>}
          <span className="inline-flex items-center gap-1">
            <StarRating rating={listing.pharmacy.reviewCount > 0 ? listing.pharmacy.rating : 0} maxStars={5} size="sm" showValue />
            <span className="text-white/50">({listing.pharmacy.reviewCount} review{listing.pharmacy.reviewCount !== 1 ? "s" : ""})</span>
          </span>
        </p>
        {distanceText != null && (
          <p className="text-xs text-gold/90 mt-1" title="Distance from your location">
            📍 {distanceText}
          </p>
        )}
        <span className="mt-3 block w-full bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2 rounded-xl text-sm font-bold text-center hover:opacity-90 transition">
          Buy now →
        </span>
      </Link>
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <PriceInsightPanel
          listingId={listing.id}
          currentPrice={listingUnitPriceExGst(listing.pricePerPack, listing.packSize)}
          viewAs="buyer"
          priceType={listing.priceType === "FIXED" ? "FIXED" : listing.priceType === "NEGOTIABLE" ? "NEGOTIABLE" : undefined}
          daysUntilExpiry={daysUntilExpiry}
          buttonLabel="💡 Price Insight"
        />
      </div>
    </div>
  );
}
