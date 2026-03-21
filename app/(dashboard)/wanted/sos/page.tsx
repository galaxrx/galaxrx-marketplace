import WantedSosContent from "@/components/wanted/WantedSosContent";

export const dynamic = "force-dynamic";

export default async function WantedSosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; urgency?: string; state?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  return <WantedSosContent searchParams={params} />;
}
