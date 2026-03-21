"use client";

import ListingCard from "@/components/listings/ListingCard";
import { format } from "date-fns";

type Listing = {
  id: string;
  productName: string;
  strength: string | null;
  form: string | null;
  packSize: number;
  condition: string;
  expiryDate: Date | string;
  pricePerPack: number;
  priceType?: string;
  originalRRP: number | null;
  quantityUnits: number;
  availableUnits?: number;
  images: string[];
  pharmacy: { name: string; rating: number; reviewCount: number; tradeCount: number; isVerified?: boolean };
};

type Props = {
  matches: Array<{ listing: Listing; notifiedAt: Date | string }>;
};

export default function WantedMatchesGrid({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-8 text-center">
        <p className="text-white/70">No matching listings yet.</p>
        <p className="text-white/50 text-sm mt-1">
          When someone lists a product you wanted, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map(({ listing, notifiedAt }) => (
        <div key={listing.id} className="relative">
          <ListingCard listing={listing as Parameters<typeof ListingCard>[0]["listing"]} />
          <p className="text-xs text-white/50 mt-2">
            Listed for you on {format(new Date(notifiedAt), "d MMM yyyy")}
          </p>
        </div>
      ))}
    </div>
  );
}
