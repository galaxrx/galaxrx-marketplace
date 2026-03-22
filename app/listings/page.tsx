import ListingsBrowseContent from "@/components/listings/ListingsBrowseContent";
import ClientOnly from "@/components/ClientOnly";
import MarketplaceLiveRefresh from "@/components/listings/MarketplaceLiveRefresh";

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; state?: string; expiry?: string; condition?: string; fulfillment?: string; minPrice?: string; maxPrice?: string; sort?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen bg-[#0D1B2A]">
      <div className="w-full max-w-none mx-auto p-4 sm:p-6 lg:px-8 xl:px-10">
        <ClientOnly fallback={null}>
          <MarketplaceLiveRefresh />
        </ClientOnly>
        <ListingsBrowseContent searchParams={params} showSignIn />
      </div>
    </div>
  );
}
