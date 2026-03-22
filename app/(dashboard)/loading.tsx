export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded-lg bg-white/10" />
      <div className="h-40 rounded-xl border border-[rgba(161,130,65,0.15)] bg-mid-navy/80" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-32 rounded-xl bg-white/5 border border-white/10" />
        <div className="h-32 rounded-xl bg-white/5 border border-white/10" />
      </div>
    </div>
  );
}
