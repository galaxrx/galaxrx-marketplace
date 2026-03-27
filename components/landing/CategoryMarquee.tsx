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
  "First Aid",
  "Sport & Fitness",
  "Home & Pet",
] as const;

export default function CategoryMarquee() {
  const loop = [...CATEGORIES, ...CATEGORIES];

  return (
    <section
      id="categories"
      className="relative overflow-hidden border-y border-gold/[0.12] bg-[#060a10]"
      aria-label="Product categories"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(201,168,76,0.04)_0%,transparent_45%,rgba(0,0,0,0.35)_100%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" aria-hidden />
      <div className="relative overflow-hidden py-6 sm:py-7" aria-hidden="true">
        <div className="marquee-category-track flex w-max items-center gap-4 pr-4 sm:gap-5">
          {loop.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="inline-flex shrink-0 items-center rounded-full border border-white/[0.09] bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-5 py-2.5 font-heading text-[0.8125rem] font-semibold tracking-wide text-white/90 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[color,box-shadow,border-color,transform] duration-300 hover:border-gold/35 hover:text-gold hover:shadow-[0_8px_32px_-12px_rgba(201,168,76,0.2)] sm:px-6 sm:text-sm sm:tracking-[0.06em]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
