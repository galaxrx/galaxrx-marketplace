export default function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center text-success text-xs font-medium ${className}`}
      title="Verified pharmacy"
    >
      ✓ Verified
    </span>
  );
}
