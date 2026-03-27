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
  "First Aid",
  "Sport & Fitness",
  "Home & Pet",
] as const;

function CategoryIcon({ label }: { label: (typeof CATEGORIES)[number] }) {
  const common = "h-3.5 w-3.5 shrink-0 text-gold";
  const sw = 1.5;

  switch (label) {
    case "Vitamins & Supplements":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <rect x="3" y="9" width="8" height="6" rx="3" />
          <rect x="13" y="9" width="8" height="6" rx="3" />
        </svg>
      );

    case "Pregnancy & Baby":
      /* Baby — round face, eyes, smile */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <circle cx="12" cy="11.5" r="5.5" />
          <circle cx="9.5" cy="10.5" r="0.85" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="10.5" r="0.85" fill="currentColor" stroke="none" />
          <path strokeLinecap="round" d="M9.5 14q2.5 1.8 5 0" />
        </svg>
      );

    case "Cosmetics":
      /* Lipstick — angled tube + cap */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 3.5h4l0.5 3.5h-5L10 3.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 7.5h7l0.5 12a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 018 19.5l0.5-12z" />
          <path strokeLinecap="round" d="M10 11h4" />
        </svg>
      );

    case "Skincare":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 3h4v3H10V3zM9 6h6l1 14a2 2 0 01-2 2h-4a2 2 0 01-2-2L9 6z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 8.5c.8 1.2 1.3 2.4 1.3 3.5 0 2-1.5 3.5-2.5 3.5S13.5 14 13.5 12c0-1.1.5-2.3 1.3-3.5.4-.6.9-1 1.2-1.2.3.2.8.6 1.2 1.2z"
          />
        </svg>
      );

    case "Hair Care":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l12-4v2L5 10V8z" />
          <path strokeLinecap="round" d="M7 10v2M9.5 9v2M12 8v2M14.5 7v2M17 6v2" />
        </svg>
      );

    case "Oral Care":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4c2.5 0 4.5 2 4.5 4.5 0 1.2-.3 2.2-.8 3.1-.3.5-.5 1.1-.6 1.7l-.3 2.2c-.1.8-.8 1.5-1.6 1.5h-2.4c-.8 0-1.5-.7-1.6-1.5l-.3-2.2c-.1-.6-.3-1.2-.6-1.7-.5-.9-.8-1.9-.8-3.1C7.5 6 9.5 4 12 4z"
          />
        </svg>
      );

    case "Personal Care":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10V8a3 3 0 016 0v2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8v10a2 2 0 01-2 2h-4a2 2 0 01-2-2V10z" />
          <path strokeLinecap="round" d="M10 14h4" />
        </svg>
      );

    case "Medicines":
      /* Pile of pills — overlapping capsules */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <ellipse cx="12" cy="16" rx="5" ry="2.5" transform="rotate(-18 12 16)" />
          <ellipse cx="9.5" cy="12.5" rx="4" ry="2" transform="rotate(22 9.5 12.5)" />
          <ellipse cx="14.5" cy="11" rx="4" ry="2" transform="rotate(-12 14.5 11)" />
          <ellipse cx="12" cy="8.5" rx="3.5" ry="1.8" transform="rotate(8 12 8.5)" />
        </svg>
      );

    case "First Aid":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <rect x="4" y="7" width="16" height="12" rx="2" />
          <path strokeLinecap="round" d="M12 10v6M9 13h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      );

    case "Sport & Fitness":
      /* Dumbbell — bar + end weights */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <rect x="2" y="8.5" width="4.5" height="7" rx="1.25" />
          <rect x="17.5" y="8.5" width="4.5" height="7" rx="1.25" />
          <path strokeLinecap="round" d="M6.5 12h11" strokeWidth={2.5} />
        </svg>
      );

    case "Home & Pet":
      /* Dog — face + floppy ears + snout */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <circle cx="12" cy="12" r="4.8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.2 8.2L5 5.5 7.5 6.8M16.8 8.2L19 5.5 16.5 6.8" />
          <ellipse cx="12" cy="13.5" rx="2" ry="1.4" />
          <circle cx="9.8" cy="10.8" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="14.2" cy="10.8" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );

    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
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
