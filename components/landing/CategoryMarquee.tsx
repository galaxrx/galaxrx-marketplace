/** Pharmacy categories for the homepage marquee (non-prescription focus). Duplicated for seamless CSS marquee. */
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
              className="inline-flex shrink-0 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-colors hover:border-gold/25 hover:text-white"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
