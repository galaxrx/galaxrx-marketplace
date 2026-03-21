export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-gold/50 border-t-gold rounded-full animate-spin" />
        <p className="text-white/70 text-sm">Loading…</p>
      </div>
    </div>
  );
}
