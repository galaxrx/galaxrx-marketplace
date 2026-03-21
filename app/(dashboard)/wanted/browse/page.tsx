import WantedBrowseContent from "@/components/wanted/WantedBrowseContent";

export const dynamic = "force-dynamic";

export default async function WantedBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; urgency?: string; state?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <WantedBrowseContent searchParams={params} />;
}
