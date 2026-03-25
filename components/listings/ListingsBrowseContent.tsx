import Link from "next/link";
import type { ComponentProps } from "react";
import { getDistance } from "geolib";
import { prisma } from "@/lib/prisma";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";
import { releaseStaleListingReservationsBatchThrottled } from "@/lib/listing-reservation";
import ListingsGridWithDistance from "@/components/listings/ListingsGridWithDistance";
import ClientOnly from "@/components/ClientOnly";
import ListingsSearch from "@/components/listings/ListingsSearch";
import ListingFilters from "@/components/listings/ListingFilters";
import ListingsPagination from "@/components/listings/ListingsPagination";
import { getPendingListingIdSet } from "@/lib/listing-pending";

const PAGE_SIZE = 10;

const searchParamsShape = {
  search: "",
  category: "",
  state: "",
  expiry: "",
  condition: "",
  fulfillment: "",
  minPrice: undefined as string | undefined,
  maxPrice: undefined as string | undefined,
  sort: "newest",
  addedAfter: undefined as string | undefined,
  lat: undefined as string | undefined,
  lng: undefined as string | undefined,
  page: undefined as string | undefined,
};

export type ListingsSearchParams = Record<string, string | undefined>;

export default async function ListingsBrowseContent({
  searchParams,
  showSignIn = false,
  variant = "browse",
}: {
  searchParams: ListingsSearchParams;
  showSignIn?: boolean;
  variant?: "buy" | "browse";
}) {
  const {
    search = "",
    category = "",
    state = "",
    expiry = "",
    condition = "",
    fulfillment = "",
    minPrice,
    maxPrice,
    sort = "newest",
    addedAfter,
    lat,
    lng,
    page: pageParam,
  } = { ...searchParamsShape, ...searchParams };

  const page = Math.max(1, parseInt(String(pageParam || "1"), 10) || 1);

  await releaseStaleListingReservationsBatchThrottled({
    maxAttempts: 40,
    minIntervalMs: 60_000,
  });

  /** Match /api/listings + listing detail: only rows with at least one unreserved unit */
  const where: Record<string, unknown> = {
    ...listingBuyableByOthersWhere(),
  };
  if (addedAfter) {
    const afterDate = new Date(addedAfter);
    if (!isNaN(afterDate.getTime())) {
      (where as Record<string, { gte: Date }>).createdAt = { gte: afterDate };
    }
  }
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
    if (!isNaN(minP)) ((where as Record<string, Record<string, number>>).pricePerPack as Record<string, number>).gte = minP;
    if (!isNaN(maxP)) ((where as Record<string, Record<string, number>>).pricePerPack as Record<string, number>).lte = maxP;
  }
  if (expiry) {
    const now = new Date();
    const day = 24 * 60 * 60 * 1000;
    if (expiry === "under30") (where as Record<string, unknown>).expiryDate = { gte: now, lte: new Date(now.getTime() + 30 * day) };
    else if (expiry === "30-60") (where as Record<string, unknown>).expiryDate = { gte: new Date(now.getTime() + 30 * day), lte: new Date(now.getTime() + 60 * day) };
    else if (expiry === "60-90") (where as Record<string, unknown>).expiryDate = { gte: new Date(now.getTime() + 60 * day), lte: new Date(now.getTime() + 90 * day) };
    else if (expiry === "over90") (where as Record<string, unknown>).expiryDate = { gte: new Date(now.getTime() + 90 * day) };
  }

  // Order by date by default; nearest requires lat/lng and pharmacy coordinates.
  const sortNearest = sort === "nearest" && lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng));
  const userCoords = sortNearest ? { latitude: Number(lat), longitude: Number(lng) } : null;

  let orderBy: { pricePerPack?: "asc"; createdAt?: "desc" | "asc"; expiryDate?: "asc" } = { createdAt: "desc" };
  if (sort === "price") orderBy = { pricePerPack: "asc" };
  else if (sort === "expiry") orderBy = { expiryDate: "asc" };
  else if (sort === "oldest") orderBy = { createdAt: "asc" };
  else if (!sortNearest) orderBy = { createdAt: "desc" };

  // Always include pharmacy lat/lng so listing cards can show distance from user
  const pharmacySelect = { name: true, rating: true, reviewCount: true, tradeCount: true, isVerified: true, latitude: true, longitude: true };

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
      fullListings = fullListings.filter((l) => l.originalRRP != null).sort((a, b) => {
        const dA = a.originalRRP ? (1 - a.pricePerPack / a.originalRRP) : 0;
        const dB = b.originalRRP ? (1 - b.pricePerPack / b.originalRRP) : 0;
        return dB - dA;
      });
    } else if (sortNearest && userCoords) {
      fullListings = [...fullListings].sort((a, b) => {
        const phA = (a.pharmacy as { latitude?: number | null; longitude?: number | null });
        const phB = (b.pharmacy as { latitude?: number | null; longitude?: number | null });
        const hasA = phA.latitude != null && phA.longitude != null;
        const hasB = phB.latitude != null && phB.longitude != null;
        if (!hasA && !hasB) return 0;
        if (!hasA) return 1;
        if (!hasB) return -1;
        const distA = getDistance(userCoords, { latitude: phA.latitude!, longitude: phA.longitude! });
        const distB = getDistance(userCoords, { latitude: phB.latitude!, longitude: phB.longitude! });
        return distA - distB;
      });
    }
    paginationTotalCount = fullListings.length;
    totalPages = Math.max(1, Math.ceil(paginationTotalCount / PAGE_SIZE));
    const memPage = Math.max(1, Math.min(clampedPage, totalPages));
    const sliced = fullListings.slice((memPage - 1) * PAGE_SIZE, memPage * PAGE_SIZE);
    const pendingSet = await getPendingListingIdSet(
      sliced.map((l) => ({
        id: l.id,
        quantityUnits: l.quantityUnits,
        reservedUnits: l.reservedUnits,
      }))
    );
    listings = sliced.map((l) => ({
      ...l,
      isPending: pendingSet.has(l.id),
      availableUnits: Math.max(0, l.quantityUnits - (l.reservedUnits ?? 0)),
    }));
  } else {
    totalPages = totalPagesForClamp;
    paginationTotalCount = totalCount;
    const raw = await prisma.listing.findMany({
      where,
      orderBy,
      skip: (clampedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { pharmacy: { select: pharmacySelect } },
    });
    const pendingSet = await getPendingListingIdSet(
      raw.map((l) => ({
        id: l.id,
        quantityUnits: l.quantityUnits,
        reservedUnits: l.reservedUnits,
      }))
    );
    listings = raw.map((l) => ({
      ...l,
      isPending: pendingSet.has(l.id),
      availableUnits: Math.max(0, l.quantityUnits - (l.reservedUnits ?? 0)),
    }));
  }

  const isBuy = variant === "buy";
  const basePath = isBuy ? "/buy" : "/listings";
  const currentPageNum = needsMemorySort
    ? Math.max(1, Math.min(clampedPage, totalPages))
    : clampedPage;

  return (
    <div className="w-full max-w-full p-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gold">
          {isBuy ? "Buy Items" : "Browse listings"}
        </h1>
        {showSignIn && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 hover:bg-white/[0.08] hover:border-white/30 transition-colors"
            >
              ← Back to home
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-gold px-4 py-2.5 text-sm font-bold font-heading text-[#0D1B2A] hover:bg-gold/90 transition-colors"
            >
              Sign in
            </Link>
          </div>
        )}
      </div>
      <div className="mb-4 flex flex-wrap gap-3 items-center w-full">
        <div className="flex-1 min-w-[12rem] max-w-2xl">
          <ClientOnly fallback={<div className="h-10 rounded-lg bg-white/5 border border-[rgba(161,130,65,0.25)] animate-pulse" />}>
            <ListingsSearch />
          </ClientOnly>
        </div>
      </div>
      <div className="mb-6">
        <ClientOnly fallback={<div className="w-full h-24 rounded-xl bg-white/5 border border-[rgba(161,130,65,0.18)] animate-pulse" />}>
          <ListingFilters basePath={isBuy ? "/buy" : "/listings"} />
        </ClientOnly>
      </div>
      <div className="w-full min-w-0">
          {listings.length === 0 ? (
            <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-8 text-center">
              <p className="text-white/70">No listings found. Try a different search or filter.</p>
              <Link href="/wanted" className="mt-3 inline-block text-gold font-medium hover:underline">Post a Wanted Request</Link>
            </div>
          ) : (
            <>
              <ClientOnly fallback={
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {listings.map((listing) => (
                    <div key={listing.id} className="h-80 rounded-xl bg-white/5 border border-[rgba(161,130,65,0.18)] animate-pulse" />
                  ))}
                </div>
              }>
                <ListingsGridWithDistance
                  listings={listings as unknown as ComponentProps<typeof ListingsGridWithDistance>["listings"]}
                  compactImages={isBuy}
                />
              </ClientOnly>
              {isBuy && (
                <ClientOnly fallback={<div className="h-10 flex items-center justify-center text-white/50 text-sm">Loading…</div>}>
                  <ListingsPagination
                    basePath={basePath}
                    currentPage={currentPageNum}
                    totalPages={totalPages}
                    totalCount={paginationTotalCount}
                    pageSize={PAGE_SIZE}
                  />
                </ClientOnly>
              )}
            </>
          )}
      </div>
    </div>
  );
}
