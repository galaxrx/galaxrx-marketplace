"use client";

type Props = {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

export default function StarRating({
  rating,
  maxStars = 5,
  size = "md",
  showValue = false,
  className = "",
}: Props) {
  const value = Math.min(maxStars, Math.max(0, Number(rating)));
  const full = Math.floor(value);
  const half = value - full >= 0.5 ? 1 : 0;
  const empty = maxStars - full - half;

  return (
    <span className={`inline-flex items-center gap-0.5 ${sizeClasses[size]} ${className}`} aria-label={`${value} out of ${maxStars} stars`}>
      {Array.from({ length: full }, (_, i) => (
        <span key={`f-${i}`} className="text-gold" aria-hidden>★</span>
      ))}
      {half > 0 && <span className="text-gold" aria-hidden>★</span>}
      {Array.from({ length: empty }, (_, i) => (
        <span key={`e-${i}`} className="text-white/30" aria-hidden>☆</span>
      ))}
      {showValue && (
        <span className="ml-1 text-white/80 font-medium tabular-nums">
          {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
        </span>
      )}
    </span>
  );
}
