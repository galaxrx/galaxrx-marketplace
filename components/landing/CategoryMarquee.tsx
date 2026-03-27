/** Pharmacy categories + compact icons for the homepage marquee. Duplicated for seamless CSS marquee. */
const CATEGORIES = [
  "Vitamins & Supplements",
  "Pregnancy & Baby",
  "Cosmetics",
  "Skincare",
  "Hair Care",
  "Oral Care",
  "Personal Care",
  "Medicines",
  "Medical Supplies",
  "First Aid",
  "Sport & Fitness",
  "Home & Pet",
] as const;

function CategoryIcon({ label }: { label: (typeof CATEGORIES)[number] }) {
  const common = "h-3.5 w-3.5 shrink-0 text-gold";
  switch (label) {
    case "Vitamins & Supplements":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 4.5L4.5 10.5a4 4 0 105.66 5.66L16.5 9.66a4 4 0 10-5.66-5.66L10.5 4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10l6-6" />
        </svg>
      );
    case "Pregnancy & Baby":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.66 0 3-1.34 3-3S13.66 5 12 5 9 6.34 9 8s1.34 3 3 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 20v-1.5C6 16 8 14 12 14s6 2 6 4.5V20" />
        </svg>
      );
    case "Cosmetics":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M9 21h6M7 8h10l-1 10H8L7 8z" />
        </svg>
      );
    case "Skincare":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c4.97 0 9-3.58 9-8 0-3.5-2.5-6.5-6-8-1.5 2-4.5 2-6 0-3.5 1.5-6 4.5-6 8 0 4.42 4.03 8 9 8z" />
        </svg>
      );
    case "Hair Care":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12v4H6V4zM8 8v12M16 8v12M10 14h4" />
        </svg>
      );
    case "Oral Care":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h.01M15 12h.01M7.5 9.5c.5-2 2.5-3 5-3s4.5 1 5 3c.5 2-1 4-2.5 5.5-1 1-2 1.5-3.5 1.5h-4c-1.5 0-2.5-.5-3.5-1.5C6.5 13.5 7 11.5 7.5 9.5z" />
        </svg>
      );
    case "Personal Care":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "Medicines":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5L13.5 4.5a4 4 0 00-5.66 0l-6 6a4 4 0 000 5.66l6 6a4 4 0 005.66 0l6-6a4 4 0 000-5.66z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l6-6" />
        </svg>
      );
    case "Medical Supplies":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "First Aid":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8M8 12h8" />
          <rect x="3" y="3" width="18" height="18" rx="3" />
        </svg>
      );
    case "Sport & Fitness":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5h4l2 4-3 2M7 19H3l-2-4 3-2M9 3l6 18" />
        </svg>
      );
    case "Home & Pet":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 9.5L12 4l7.5 5.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6h6v6" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export default function CategoryMarquee() {
  const loop = [...CATEGORIES, ...CATEGORIES];

  return (
    <section
      id="categories"
      className="relative overflow-hidden border-y border-white/[0.07] bg-[#080f18] py-5 sm:py-6"
      aria-label="Product categories"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(201,168,76,0.06),transparent_55%)]" aria-hidden />
      <div className="relative overflow-hidden" aria-hidden="true">
        <div className="marquee-category-track flex w-max items-center gap-3 pr-3">
          {loop.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-2 pl-2.5 pr-4 text-sm font-medium text-white/85 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-colors hover:border-gold/25 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/[0.12] ring-1 ring-gold/20">
                <CategoryIcon label={label} />
              </span>
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
