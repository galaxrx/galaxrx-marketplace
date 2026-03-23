/** Matches the home hero “Verified B2B marketplace” pill — use for section labels on marketing pages. */
export default function MarketingEyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`inline-flex items-center rounded-full border border-gold/25 bg-white/[0.04] px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold shadow-[0_0_24px_-4px_rgba(201,168,76,0.35)] backdrop-blur-md ring-1 ring-white/[0.06] sm:text-[0.65rem] ${className}`}
    >
      {children}
    </p>
  );
}
