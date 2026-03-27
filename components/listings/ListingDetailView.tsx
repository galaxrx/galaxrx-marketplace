import Link from "next/link";
import type { ComponentProps } from "react";
import { format, differenceInDays } from "date-fns";
import ListingImageGallery from "@/components/listings/ListingImageGallery";
import ListingCard from "@/components/listings/ListingCard";
import ListingDetailClient from "@/components/listings/ListingDetailClient";
import StarRating from "@/components/ui/StarRating";
import { getDeliveryOption } from "@/lib/deliveryOptions";
import { CATEGORY_LABELS } from "@/lib/categories";
import { effectivePackSize } from "@/lib/listing-units";
import {
  isPerUnitListing,
  listingBuyerAvailabilityLine,
  listingPrimaryPriceExGstLabel,
} from "@/lib/listing-price-display";
import { PLATFORM } from "@/lib/platform";

function ExpiryBadge({ date }: { date: Date }) {
  const days = differenceInDays(date, new Date());
  let bg = "bg-success/20 text-success";
  if (days < 30) bg = "bg-error/20 text-error";
  else if (days < 60) bg = "bg-warning/20 text-warning";
  else if (days < 90) bg = "bg-amber-500/20 text-amber-400";
  return (
    <span className={`inline-flex items-center gap-1 text-sm px-2 py-1 rounded ${bg}`}>
      {days < 30 && "🔴"}
      {days >= 30 && days < 60 && "🟠"}
      {days >= 60 && days < 90 && "🟡"}
      {days >= 90 && "🟢"}
      Expires in {days > 0 ? `${days} days` : "expired"}
    </span>
  );
}

type ListingDetailViewProps = {
  listing: {
    images: string[];
    category: string;
    productName: string;
    genericName?: string | null;
    brand?: string | null;
    strength?: string | null;
    form?: string | null;
    packSize: string | number;
    quantityUnits: number;
    availableUnits?: number;
    reservedUnits?: number;
    drugMaster?: { pbsCode?: string | null } | null;
    condition: string;
    fulfillmentType: string;
    createdAt: Date | string;
    updatedAt?: Date | string;
    pricePerPack: number;
    expiryDate: Date | string;
    description?: string | null;
    noteToPurchasers?: string | null;
    pharmacy: {
      id: string;
      name: string;
      suburb: string;
      state: string;
      isVerified: boolean;
      rating: number;
      reviewCount: number;
      tradeCount: number;
      createdAt: Date | string;
    };
  } | null;
  session: { user: { id: string; isVerified?: boolean } } | null;
  sellerReviews: Array<{ id: string; rating: number; comment: string | null; reviewer: { name: string } }>;
  related: Array<{
    id: string;
    productName: string;
    images: string[];
    pharmacy: { name: string; rating: number; reviewCount: number; tradeCount: number; isVerified: boolean };
    [key: string]: unknown;
  }>;
  listingForPriceBox: Record<string, unknown>;
  /** When set, this buyer has an accepted offer — show and use this price instead of listing price (only for this buyer). */
  acceptedPricePerPack?: number;
  stateLabel: string;
  id: string;
  /** True when seller has accepted at least one offer and the item is pending payment */
  isPending?: boolean;
};

export default function ListingDetailView({
  listing,
  session,
  sellerReviews,
  related,
  listingForPriceBox,
  acceptedPricePerPack,
  stateLabel,
  id,
  isPending,
}: ListingDetailViewProps) {
  if (!listing) return null;

  const packSz = effectivePackSize(listing.packSize);
  const availNow = Math.max(0, listing.availableUnits ?? listing.quantityUnits);
  const reservedForLine = listing.reservedUnits ?? Math.max(0, listing.quantityUnits - availNow);
  const displayPriceExGst = acceptedPricePerPack ?? listing.pricePerPack;

  return (
    <main className="min-h-screen">
      <div className="w-full max-w-none mx-auto p-4 md:p-6 lg:px-8 xl:px-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Link href="/buy" className="text-gold text-sm hover:underline">
            ← Back to BUY ITEM
          </Link>
          {isPending && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30" title="Seller has accepted an offer; payment pending">
              Pending
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            <div className="max-w-2xl">
              <ListingImageGallery images={listing.images} category={listing.category} />
            </div>

            <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4 md:p-6">
              <h2 className="font-heading font-semibold text-lg text-white mb-4">Product details</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-white/60">Product Name</dt>
                <dd className="font-medium text-white/90">{listing.productName}</dd>
                {listing.genericName && (
                  <>
                    <dt className="text-white/60">Generic Name</dt>
                    <dd className="font-medium text-white/90">{listing.genericName}</dd>
                  </>
                )}
                {listing.brand && (
                  <>
                    <dt className="text-white/60">Brand</dt>
                    <dd className="font-medium text-white/90">{listing.brand}</dd>
                  </>
                )}
                {listing.strength && (
                  <>
                    <dt className="text-white/60">Strength</dt>
                    <dd className="font-medium text-white/90">{listing.strength}</dd>
                  </>
                )}
                {listing.form && (
                  <>
                    <dt className="text-white/60">Form</dt>
                    <dd className="font-medium text-white/90">{listing.form}</dd>
                  </>
                )}
                <dt className="text-white/60">{packSz <= 1 ? "How it's listed" : "Units per pack"}</dt>
                <dd className="font-medium text-white/90">
                  {packSz <= 1
                    ? "By unit — price is per single unit"
                    : `${packSz} units per sealed pack — price is per pack`}
                </dd>
                <dt className="text-white/60">Stock listed</dt>
                <dd className="font-medium text-white/90">
                  {listing.quantityUnits} units
                  {packSz > 1 &&
                    ` (~${Math.floor(listing.quantityUnits / packSz)} full packs of ${packSz})`}
                </dd>
                {listing.drugMaster?.pbsCode && (
                  <>
                    <dt className="text-white/60">PBS Code</dt>
                    <dd className="font-medium text-white/90">{listing.drugMaster.pbsCode}</dd>
                  </>
                )}
                <dt className="text-white/60">Category</dt>
                <dd className="font-medium text-white/90">{CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS] ?? listing.category.replace(/_/g, " ")}</dd>
                <dt className="text-white/60">Condition</dt>
                <dd className="font-medium text-white/90">{listing.condition}</dd>
                <dt className="text-white/60">Delivery</dt>
                <dd className="font-medium text-white/90">
                  {getDeliveryOption(listing.fulfillmentType).label}
                  <span className="block text-white/60 text-xs font-normal mt-0.5">{getDeliveryOption(listing.fulfillmentType).description}</span>
                </dd>
                <dt className="text-white/60">State</dt>
                <dd className="font-medium text-white/90">{stateLabel}</dd>
                <dt className="text-white/60">Listed</dt>
                <dd className="font-medium text-white/90">{format(new Date(listing.createdAt), "d MMM yyyy")}</dd>
                <dt className="text-white/60">Date last Modified</dt>
                <dd className="font-medium text-white/90">
                  {format(new Date(listing.updatedAt ?? listing.createdAt), "yyyy-MM-dd HH:mm:ss")}
                </dd>
                <dt className="text-white/60">Available to buy now</dt>
                <dd className="font-medium text-white/90">
                  {listingBuyerAvailabilityLine(availNow, listing.packSize, {
                    listedTotal: listing.quantityUnits,
                    reservedUnits: reservedForLine,
                  })}
                </dd>
                <dt className="text-white/60">
                  {isPerUnitListing(listing.packSize) ? "Price (per unit)" : "Price (per pack)"}
                </dt>
                <dd className="font-medium text-white/90">
                  {listingPrimaryPriceExGstLabel(displayPriceExGst, listing.packSize)}
                </dd>
                <dt className="text-white/60">Seller Suburb</dt>
                <dd className="font-medium text-white/90">{listing.pharmacy.suburb}</dd>
                <dt className="text-white/60">Seller State</dt>
                <dd className="font-medium text-white/90">{listing.pharmacy.state}</dd>
              </dl>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-white/60 text-sm">Expiry: {format(new Date(listing.expiryDate), "MMMM yyyy")}</span>
                <ExpiryBadge date={new Date(listing.expiryDate)} />
              </div>
            </div>

            {listing.description && (
              <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4 md:p-6">
                <h3 className="font-heading font-semibold text-lg text-white mb-2">Comments</h3>
                <p className="text-white/90 text-sm whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}
            {listing.noteToPurchasers && (
              <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4 md:p-6">
                <h3 className="font-heading font-semibold text-lg text-white mb-2">Note to Purchasers</h3>
                <p className="text-white/90 text-sm whitespace-pre-wrap">{listing.noteToPurchasers}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <ListingDetailClient
              listing={listingForPriceBox as ComponentProps<typeof ListingDetailClient>["listing"]}
              acceptedPricePerPack={acceptedPricePerPack}
              session={session}
            />
            <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{listing.pharmacy.name}</h3>
                {listing.pharmacy.isVerified && <span className="text-success" title="Verified">✓</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                {listing.pharmacy.reviewCount > 0 ? (
                  <>
                    <StarRating rating={listing.pharmacy.rating} maxStars={5} size="md" showValue />
                    <span>({listing.pharmacy.reviewCount} review{listing.pharmacy.reviewCount !== 1 ? "s" : ""})</span>
                  </>
                ) : (
                  <span>New seller</span>
                )}
                {listing.pharmacy.tradeCount > 0 && (
                  <span>· {listing.pharmacy.tradeCount} trades</span>
                )}
              </div>
              <p className="text-sm text-white/70 mt-1">📍 {listing.pharmacy.suburb}, {listing.pharmacy.state}</p>
              <p className="text-xs text-white/60 mt-1">
                Member since {format(new Date(listing.pharmacy.createdAt), "MMM yyyy")}
              </p>
              <Link
                href={`/listings?pharmacyId=${listing.pharmacy.id}`}
                className="inline-block mt-3 text-gold text-sm font-medium hover:underline"
              >
                View all listings →
              </Link>
              {sellerReviews.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white/80 mb-2">Recent reviews</h4>
                  <ul className="space-y-2">
                    {sellerReviews.map((rev) => (
                      <li key={rev.id} className="text-sm">
                        <StarRating rating={rev.rating} maxStars={5} size="sm" />
                        {rev.comment && <p className="text-white/70 mt-0.5 truncate max-w-full" title={rev.comment}>{rev.comment}</p>}
                        <p className="text-white/50 text-xs mt-0.5">— {rev.reviewer.name}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="font-heading font-semibold text-lg text-white mb-4">
              More listings for {listing.productName}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {related.map((r) => (
                <div key={r.id} className="flex-shrink-0 w-72">
                  <ListingCard
                    listing={{
                      ...r,
                      pharmacy: {
                        name: r.pharmacy.name,
                        rating: r.pharmacy.rating,
                        reviewCount: r.pharmacy.reviewCount,
                        tradeCount: r.pharmacy.tradeCount,
                        isVerified: r.pharmacy.isVerified,
                      },
                    } as ComponentProps<typeof ListingCard>["listing"]}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-center text-sm text-white/60">
          See something wrong?{" "}
          <a
            href={`mailto:${PLATFORM.email}?subject=Report listing ${id}`}
            className="text-gold hover:underline"
          >
            Report this listing
          </a>
        </p>
      </div>
    </main>
  );
}
