"use client";

const TOOLTIP_TEXT = `Matching listings
Click Find matching listings → on any wanted item above to see marketplace listings that match it.

If there are no listings for that product yet, you'll see: No matches in the marketplace yet.`;

export default function MatchingListingsTooltip() {
  return (
    <span className="inline-flex items-center align-middle ml-2 group relative">
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-gold text-xs font-bold cursor-help"
        aria-label="Matching listings help"
        title={TOOLTIP_TEXT}
      >
        ?
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 w-72 text-left text-sm text-white bg-mid-navy border border-[rgba(161,130,65,0.3)] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-pre-line">
        {TOOLTIP_TEXT}
      </span>
    </span>
  );
}
