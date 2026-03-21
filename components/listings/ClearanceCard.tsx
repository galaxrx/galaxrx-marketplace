import Link from "next/link";
import Image from "next/image";
import { differenceInDays, format } from "date-fns";
import {
  listingPackContextLine,
  listingPrimaryPriceExGstLabel,
  listingSecondaryPriceExGstLine,
} from "@/lib/listing-price-display";
import StarRating from "@/components/ui/StarRating";

type Listing = {
  id: string;
  productName: string;
  strength: string | null;
  form: string | null;
  packSize: number;
  condition: string;
  expiryDate: Date;
  pricePerPack: number;
  originalRRP: number | null;
  quantityUnits: number;
  availableUnits?: number;
  images: string[];
  pharmacy: { name: string; rating: number; reviewCount: number; tradeCount: number; isVerified?: boolean };
};

export default function ClearanceCard({ listing }: { listing: Listing }) {
  const days = differenceInDays(new Date(listing.expiryDate), new Date());
  const secondaryPriceLine = listingSecondaryPriceExGstLine(listing.pricePerPack, listing.packSize);
  const discount = listing.originalRRP
    ? Math.round((1 - listing.pricePerPack / listing.originalRRP) * 100)
    : null;
  let expiryBg = "bg-success/20 text-success";
  if (days < 30) expiryBg = "bg-error/20 text-error";
  else if (days < 60) expiryBg = "bg-warning/20 text-warning";
  else if (days < 90) expiryBg = "bg-amber-100 text-amber-800";

  const firstImage = listing.images?.length ? listing.images[0] : null;

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4 hover:border-gold/40 transition shadow-lg">
        <div className={`text-center py-2 rounded-lg font-bold text-lg ${expiryBg} mb-3`}>
          {days > 0 ? `${days} days left` : "Expired"}
        </div>
        <div className="aspect-video bg-white/5 rounded-lg mb-3 overflow-hidden flex items-center justify-center text-white/40 text-sm border border-[rgba(161,130,65,0.15)] relative">
          {firstImage ? (
            <Image
              src={firstImage}
              alt={listing.productName}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <span>No image</span>
          )}
        </div>
        <h3 className="font-semibold text-white truncate">{listing.productName}</h3>
        <p className="text-sm text-white/70">
          {listingPackContextLine(listing.packSize, listing.condition)} · Exp: {format(new Date(listing.expiryDate), "MMM yyyy")}
        </p>
        <p className="mt-2 text-lg font-bold text-gold">{listingPrimaryPriceExGstLabel(listing.pricePerPack, listing.packSize)}</p>
        {secondaryPriceLine && <p className="text-xs text-white/55">{secondaryPriceLine}</p>}
        {discount != null && (
          <p className="text-sm text-white/60"><span className="line-through">${listing.originalRRP?.toFixed(2)}</span> -{discount}%</p>
        )}
        <p className="text-xs text-white/60 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span>
            {listing.pharmacy.name} {listing.pharmacy.isVerified && " ✓"}
          </span>
          <span className="inline-flex items-center gap-1 text-white/50">
            <StarRating
              rating={listing.pharmacy.reviewCount > 0 ? listing.pharmacy.rating : 0}
              maxStars={5}
              size="sm"
              showValue
            />
            <span>({listing.pharmacy.reviewCount} review{listing.pharmacy.reviewCount !== 1 ? "s" : ""})</span>
          </span>
        </p>
        <span className="mt-3 block w-full bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2 rounded-xl text-sm font-bold text-center hover:opacity-90 transition">
          Buy now →
        </span>
      </div>
    </Link>
  );
}
