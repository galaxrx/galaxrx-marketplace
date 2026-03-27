/** Pharmacy surplus / clearance categories (non-prescription only). Duplicated for seamless CSS marquee. */
const CATEGORIES = [
  "OTC Medicines",
  "Vitamins",
  "Supplements",
  "Skincare",
  "Baby Care",
  "Personal Care",
  "Wound Care",
  "First Aid",
  "Oral Care",
  "Hair Care",
  "Cosmetics",
  "Fragrances",
  "Wellness",
  "Sexual Health",
  "Women's Health",
  "Men's Health",
  "Allergy Relief",
  "Pain Relief",
  "Digestive Health",
  "Pet Care",
  "Mobility Aids",
  "Medical Consumables",
  "Seasonal Products",
  "Clearance Stock",
  "Short-Dated Stock",
] as const;

export default function CategoryMarquee() {
  const loop = [...CATEGORIES, ...CATEGORIES];

  return (
    <section
      id="categories"
      className="relative overflow-hidden border-y border-white/[0.07] bg-[#080f18] py-8 sm:py-10"
      aria-labelledby="categories-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(201,168,76,0.06),transparent_55%)]" aria-hidden />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 id="categories-heading" className="mb-5 text-center font-heading text-xs font-semibold uppercase tracking-[0.28em] text-gold/90">
          Categories you&apos;ll trade
        </h2>
        <p className="mx-auto mb-6 max-w-2xl text-center text-sm leading-relaxed text-white/50">
          Surplus and clearance across non-prescription pharmacy ranges — no prescription-only products on GalaxRX.
        </p>
      </div>
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
