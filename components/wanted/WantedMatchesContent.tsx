import Link from "next/link";
import type { ComponentProps } from "react";
import { getDistance } from "geolib";
import { prisma } from "@/lib/prisma";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";
import { releaseStaleListingReservationsBatchThrottled } from "@/lib/listing-reservation";
import ListingsGridWithDistance from "@/components/listings/ListingsGridWithDistance";
import ClientOnly from "@/components/ClientOnly";
import ListingFilters from "@/components/listings/ListingFilters";
import SortByBar from "@/components/listings/SortByBar";
import ListingsPagination from "@/components/listings/ListingsPagination";

const PAGE_SIZE = 10;

type WantedItemSummary = {
  id: string;
  productName: string;
  strength: string | null;
  maxPrice: number | null;
  quantity: number;
  quantityKind: string;
  unitsPerPack: number | null;
};

type SearchParams = Record<string, string | undefined>;

export default async function WantedMatchesContent({
  wantedItem,
  searchParams,
}: {
  wantedItem: WantedItemSummary;
  searchParams: SearchParams;
}) {
  const search = [wantedItem.productName, wantedItem.strength].filter(Boolean).join(" ").trim();
  const {
    category = "",
    state = "",
    expiry = "",
    condition = "",
    fulfillment = "",
    minPrice,
    maxPrice: maxPriceParam,
    sort = "newest",
    lat,
    lng,
    page: pageParam,
  } = searchParams;

  const defaultMaxPrice =
    wantedItem.maxPrice != null ? String(wantedItem.maxPrice) : undefined;
  const maxPrice = maxPriceParam ?? defaultMaxPrice ?? "";

  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);

  await releaseStaleListingReservationsBatchThrottled({
    maxAttempts: 40,
    minIntervalMs: 60_000,
  });

  const where: Record<string, unknown> = { ...listingBuyableByOthersWhere() };
  if (search) {
    where.OR = [
      { productName: { contains: search, mode: "insensitive" } },
      { genericName: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }
  if (category) where.category = category;
  if (state) where.stateRestriction = state;
  if (condition) where.condition = condition;
  if (fulfillment) where.fulfillmentType = fulfillment;
  const minP = minPrice != null && minPrice !== "" ? parseFloat(minPrice) : NaN;
  const maxP = maxPrice != null && maxPrice !== "" ? parseFloat(maxPrice) : NaN;
  if (!isNaN(minP) || !isNaN(maxP)) {
    (where as Record<string, unknown>).pricePerPack = {};
    if (!isNaN(minP))
      ((where as Record<string, Record<string, number>>).pricePerPack as Record<string, number>).gte = minP;
    if (!isNaN(maxP))
      ((where as Record<string, Record<string, number>>).pricePerPack as Record<string, number>).lte = maxP;
  }
  if (expiry) {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    if (expiry === "under30")
      (where as Record<string, unknown>).expiryDate = {
        gte: now,
        lte: new Date(now.getTime() + 30 * day),
      };
    else if (expiry === "30-60")
      (where as Record<string, unknown>).expiryDate = {
        gte: new Date(now.getTime() + 30 * day),
        lte: new Date(now.getTime() + 60 * day),
      };
    else if (expiry === "60-90")
      (where as Record<string, unknown>).expiryDate = {
        gte: new Date(now.getTime() + 60 * day),
        lte: new Date(now.getTime() + 90 * day),
      };
    else if (expiry === "over90")
      (where as Record<string, unknown>).expiryDate = {
        gte: new Date(now.getTime() + 90 * day),
      };
  }

  const sortNearest =
    sort === "nearest" &&
    lat != null &&
    lng != null &&
    !isNaN(Number(lat)) &&
    !isNaN(Number(lng));
  const userCoords = sortNearest
    ? { latitude: Number(lat), longitude: Number(lng) }
    : null;

  let orderBy: {
    pricePerPack?: "asc";
    createdAt?: "desc" | "asc";
    expiryDate?: "asc";
  } = { createdAt: "desc" };
  if (sort === "price") orderBy = { pricePerPack: "asc" };
  else if (sort === "expiry") orderBy = { expiryDate: "asc" };
  else if (sort === "oldest") orderBy = { createdAt: "asc" };
  else if (!sortNearest) orderBy = { createdAt: "desc" };

  const pharmacySelect = {
    name: true,
    rating: true,
    reviewCount: true,
    tradeCount: true,
    isVerified: true,
    latitude: true,
    longitude: true,
  };

  const needsMemorySort = sort === "discount" || sortNearest;
  const totalCount = await prisma.listing.count({ where });
  const totalPagesForClamp = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const clampedPage = Math.max(1, Math.min(page, totalPagesForClamp));

  let listings: Awaited<ReturnType<typeof prisma.listing.findMany>>;
  let totalPages: number;
  let paginationTotalCount: number;

  if (needsMemorySort) {
    let fullListings = await prisma.listing.findMany({
      where,
      orderBy: sortNearest ? { createdAt: "desc" } : orderBy,
      take: 2000,
      include: { pharmacy: { select: pharmacySelect } },
    });
    if (sort === "discount") {
      fullListings = fullListings
        .filter((l) => l.originalRRP != null)
        .sort((a, b) => {
          const dA = a.originalRRP ? 1 - a.pricePerPack / a.originalRRP : 0;
          const dB = b.originalRRP ? 1 - b.pricePerPack / b.originalRRP : 0;
          return dB - dA;
        });
    } else if (sortNearest && userCoords) {
      fullListings = [...fullListings].sort((a, b) => {
        const phA = a.pharmacy as {
          latitude?: number | null;
          longitude?: number | null;
        };
        const phB = b.pharmacy as {
          latitude?: number | null;
          longitude?: number | null;
        };
        const hasA = phA.latitude != null && phA.longitude != null;
        const hasB = phB.latitude != null && phB.longitude != null;
        if (!hasA && !hasB) return 0;
        if (!hasA) return 1;
        if (!hasB) return -1;
        const distA = getDistance(userCoords, {
          latitude: phA.latitude!,
          longitude: phA.longitude!,
        });
        const distB = getDistance(userCoords, {
          latitude: phB.latitude!,
          longitude: phB.longitude!,
        });
        return distA - distB;
      });
    }
    paginationTotalCount = fullListings.length;
    totalPages = Math.max(1, Math.ceil(paginationTotalCount / PAGE_SIZE));
    const memPage = Math.max(1, Math.min(clampedPage, totalPages));
    listings = fullListings.slice(
      (memPage - 1) * PAGE_SIZE,
      memPage * PAGE_SIZE
    );
  } else {
    totalPages = totalPagesForClamp;
    paginationTotalCount = totalCount;
    listings = await prisma.listing.findMany({
      where,
      orderBy,
      skip: (clampedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { pharmacy: { select: pharmacySelect } },
    });
  }

  const basePath = `/wanted/${wantedItem.id}/matches`;
  const currentPageNum = needsMemorySort
    ? Math.max(1, Math.min(clampedPage, totalPages))
    : clampedPage;

  const gridListings = listings.map((l) => ({
    ...l,
    availableUnits: Math.max(0, l.quantityUnits - (l.reservedUnits ?? 0)),
  }));

  return (
    <div className="w-full max-w-full p-0">
      <Link
        href="/wanted"
        className="inline-flex items-center gap-1.5 text-sm text-gold hover:text-gold/90 font-medium mb-6 transition"
      >
        ← Back to My wanted items
      </Link>

      <div className="rounded-2xl border border-[rgba(161,130,65,0.25)] bg-gradient-to-br from-mid-navy to-mid-navy/95 p-5 mb-8 shadow-lg">
        <p className="text-xs font-medium text-gold/90 uppercase tracking-wider mb-2">
          Matching listings for
        </p>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-white mb-1">
          {wantedItem.productName}
          {wantedItem.strength && (
            <span className="text-white/80 font-normal"> · {wantedItem.strength}</span>
          )}
        </h1>
        <p className="text-sm text-white/70">
          {wantedItem.quantityKind === "UNIT" ? (
            <>
              You need {wantedItem.quantity} unit{wantedItem.quantity !== 1 ? "s" : ""}
              {wantedItem.maxPrice != null && ` · Max $${wantedItem.maxPrice.toFixed(2)}/unit`}
            </>
          ) : (
            <>
              You need {wantedItem.quantity} pack{wantedItem.quantity !== 1 ? "s" : ""}
              {wantedItem.unitsPerPack != null && wantedItem.unitsPerPack >= 1
                ? ` (${wantedItem.unitsPerPack} units each, ${wantedItem.quantity * wantedItem.unitsPerPack} total)`
                : ""}
              {wantedItem.maxPrice != null && ` · Max $${wantedItem.maxPrice.toFixed(2)}/pack`}
            </>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-white/80 text-sm">
          {paginationTotalCount === 0
            ? "No matching listings right now."
            : `${paginationTotalCount} listing${paginationTotalCount !== 1 ? "s" : ""} match your wanted item.`}
        </p>
        <ClientOnly
          fallback={
            <div className="h-9 w-48 rounded-lg bg-white/5 border border-[rgba(161,130,65,0.3)] animate-pulse" />
          }
        >
          <SortByBar basePath={basePath} />
        </ClientOnly>
      </div>

      <div className="mb-6">
        <ClientOnly
          fallback={
            <div className="w-full h-24 rounded-xl bg-white/5 border border-[rgba(161,130,65,0.18)] animate-pulse" />
          }
        >
          <ListingFilters
            basePath={basePath}
            defaultMaxPrice={
              wantedItem.maxPrice != null
                ? String(wantedItem.maxPrice)
                : undefined
            }
          />
        </ClientOnly>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
          <div className="min-w-0">
          {gridListings.length === 0 ? (
            <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-10 text-center">
              <p className="text-lg font-semibold text-gold mb-2">
                No matches in the marketplace yet
              </p>
              <p className="text-white/70 mb-2">
                No listings match &quot;{search}&quot; with your current filters.
              </p>
              <p className="text-sm text-white/60 mb-4">
                Try relaxing filters (price, expiry, state) or check back later.
              </p>
              <Link
                href="/buy"
                className="inline-block text-gold font-medium hover:underline"
              >
                Browse all Buy listings →
              </Link>
            </div>
          ) : (
            <>
              <ClientOnly
                fallback={
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {gridListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="h-80 rounded-xl bg-white/5 border border-[rgba(161,130,65,0.18)] animate-pulse"
                      />
                    ))}
                  </div>
                }
              >
                <ListingsGridWithDistance listings={gridListings as unknown as ComponentProps<typeof ListingsGridWithDistance>["listings"]} />
              </ClientOnly>
              <ClientOnly
                fallback={
                  <div className="h-10 flex items-center justify-center text-white/50 text-sm">
                    Loading…
                  </div>
                }
              >
                <ListingsPagination
                  basePath={basePath}
                  currentPage={currentPageNum}
                  totalPages={totalPages}
                  totalCount={paginationTotalCount}
                  pageSize={PAGE_SIZE}
                />
              </ClientOnly>
            </>
          )}
          </div>
        </div>
    </div>
  );
}
