export default function SkeletonCard() {
  return (
    <div className="bg-mid-navy border border-white/10 rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
      <div className="h-3 bg-white/10 rounded w-1/2 mb-2" />
      <div className="h-3 bg-white/10 rounded w-1/3" />
    </div>
  );
}
