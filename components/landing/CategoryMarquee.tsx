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
  const sw = 1.5;

  switch (label) {
    case "Vitamins & Supplements":
      /* Two pill capsules */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <rect x="3" y="9" width="8" height="6" rx="3" />
          <rect x="13" y="9" width="8" height="6" rx="3" />
        </svg>
      );

    case "Pregnancy & Baby":
      /* Baby bottle */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4v2.5a2 2 0 01-2 2h0a2 2 0 01-2-2V4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.5h6l1 11a2 2 0 01-2 2H10a2 2 0 01-2-2l1-11z" />
          <path strokeLinecap="round" d="M11 14h2" />
        </svg>
      );

    case "Cosmetics":
      /* Lipstick */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 4h6l1 4H8l1-4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8v11a2 2 0 01-2 2h-4a2 2 0 01-2-2V8z" />
          <path strokeLinecap="round" d="M10 12h4" />
        </svg>
      );

    case "Skincare":
      /* Lotion bottle + droplet */
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
      /* Comb */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l12-4v2L5 10V8z" />
          <path strokeLinecap="round" d="M7 10v2M9.5 9v2M12 8v2M14.5 7v2M17 6v2" />
        </svg>
      );

    case "Oral Care":
      /* Tooth */
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
      /* Soap / pump dispenser */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10V8a3 3 0 016 0v2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8v10a2 2 0 01-2 2h-4a2 2 0 01-2-2V10z" />
          <path strokeLinecap="round" d="M10 14h4" />
        </svg>
      );

    case "Medicines":
      /* Pill bottle with Rx-style cross */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8v3H8V4zM7 7h10v13a2 2 0 01-2 2H9a2 2 0 01-2-2V7z" />
          <path strokeLinecap="round" d="M12 11v4M10 13h4" />
        </svg>
      );

    case "Medical Supplies":
      /* Bandage roll */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <ellipse cx="12" cy="12" rx="7" ry="4" transform="rotate(-25 12 12)" />
          <path strokeLinecap="round" d="M8.5 10.5l7 7M9.5 13.5l4 4" />
        </svg>
      );

    case "First Aid":
      /* First aid kit with cross */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <rect x="4" y="7" width="16" height="12" rx="2" />
          <path strokeLinecap="round" d="M12 10v6M9 13h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      );

    case "Sport & Fitness":
      /* Dumbbell */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <rect x="2" y="9" width="4" height="6" rx="1" />
          <rect x="18" y="9" width="4" height="6" rx="1" />
          <path strokeLinecap="round" d="M6 12h12" />
        </svg>
      );

    case "Home & Pet":
      /* House + paw pad */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l7.5-5.5L18 11v8a1 1 0 01-1 1h-3.5v-4h-5v4H4a1 1 0 01-1-1v-8z" />
          <ellipse cx="17.5" cy="7" rx="2" ry="1.8" />
          <circle cx="15.2" cy="5.2" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="4.5" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="19.8" cy="5.2" r="0.9" fill="currentColor" stroke="none" />
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
