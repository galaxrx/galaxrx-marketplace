import ListingsBrowseContent from "@/components/listings/ListingsBrowseContent";
import ClientOnly from "@/components/ClientOnly";
import MarketplaceLiveRefresh from "@/components/listings/MarketplaceLiveRefresh";

export const dynamic = "force-dynamic";

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; state?: string; expiry?: string; condition?: string; fulfillment?: string; minPrice?: string; maxPrice?: string; sort?: string; addedAfter?: string; lat?: string; lng?: string; page?: string }>;
}) {
  const params = await searchParams;
  return (
    <ClientOnly fallback={<div className="flex items-center justify-center min-h-[200px] text-white/50">Loading…</div>}>
      <>
        <MarketplaceLiveRefresh />
        <ListingsBrowseContent searchParams={params} variant="buy" />
      </>
    </ClientOnly>
  );
}
