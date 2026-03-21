import dynamic from "next/dynamic";

const SellPageClient = dynamic(() => import("@/components/sell/SellPageClient"), {
  loading: () => (
    <div className="w-full max-w-none py-6">
      <div className="h-8 w-40 rounded bg-white/10 animate-pulse mb-6" />
      <div className="h-28 rounded-xl bg-white/5 border border-[rgba(161,130,65,0.18)] animate-pulse" />
    </div>
  ),
});

export default async function SellPage({
  searchParams,
}: {
  searchParams: { repeat?: string; edit?: string };
}) {
  const params = searchParams;
  return (
    <SellPageClient
      repeatId={params.repeat ?? null}
      editId={params.edit ?? null}
    />
  );
}
