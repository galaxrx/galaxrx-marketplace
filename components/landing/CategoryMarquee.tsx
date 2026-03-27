import Image from "next/image";

const CATEGORIES = [
  { label: "Vitamins & Supplements", iconSrc: "/icon/supplement.png" },
  { label: "Pregnancy & Baby", iconSrc: "/icon/baby.png" },
  { label: "Cosmetics", iconSrc: "/icon/cosmetic.png" },
  { label: "Skincare", iconSrc: "/icon/skincare.png" },
  { label: "Hair Care", iconSrc: "/icon/hair.png" },
  { label: "Oral Care", iconSrc: "/icon/oral care.png" },
  { label: "Personal Care", iconSrc: "/icon/personalcare.png" },
  { label: "Medicines", iconSrc: "/icon/medicine.png" },
  { label: "First Aid", iconSrc: "/icon/firstaid.png" },
  { label: "Sport & Fitness", iconSrc: "/icon/dumble.png" },
  { label: "Home & Pet", iconSrc: "/icon/pet.png" },
] as const;

function CategoryChip({ label, iconSrc }: { label: string; iconSrc: string }) {
  return (
    <span className="category-chip group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/[0.1] bg-gradient-to-b from-white/[0.09] to-white/[0.02] py-2.5 pl-3 pr-5 shadow-[0_6px_28px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.07)] backdrop-blur-md transition-[border-color,box-shadow,transform,color] duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_12px_36px_-14px_rgba(201,168,76,0.28)] sm:gap-3 sm:py-3 sm:pl-3.5 sm:pr-6">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/[0.09] transition-[border-color,background-color,transform] duration-300 group-hover:scale-105 group-hover:border-gold/35 group-hover:bg-gold/[0.14] sm:h-9 sm:w-9">
        <Image
          src={iconSrc}
          alt=""
          width={18}
          height={18}
          className="h-4 w-4 object-contain opacity-90 brightness-0 invert sm:h-[1.125rem] sm:w-[1.125rem]"
          sizes="18px"
          aria-hidden
        />
      </span>
      <span className="font-heading text-[0.8125rem] font-semibold tracking-wide text-white/92 sm:text-sm sm:tracking-[0.04em]">
        {label}
      </span>
    </span>
  );
}

export default function CategoryMarquee() {
  const loop = [...CATEGORIES, ...CATEGORIES];

  return (
    <section
      id="categories"
      className="relative overflow-hidden border-y border-gold/[0.14] bg-[#04070c]"
      aria-label="Tradable pharmacy categories"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(201,168,76,0.055)_0%,transparent_42%,rgba(0,0,0,0.45)_100%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" aria-hidden />

      <div className="relative space-y-3 py-8 sm:space-y-3.5 sm:py-10" aria-hidden="true">
        <div className="overflow-hidden py-1">
          <div className="marquee-category-track flex w-max items-center gap-3 pr-3 sm:gap-4 sm:pr-4">
            {loop.map(({ label, iconSrc }, i) => (
              <CategoryChip key={`a-${label}-${i}`} label={label} iconSrc={iconSrc} />
            ))}
          </div>
        </div>
        <div className="overflow-hidden py-1">
          <div className="marquee-category-track marquee-category-track-reverse flex w-max items-center gap-3 pr-3 sm:gap-4 sm:pr-4">
            {loop.map(({ label, iconSrc }, i) => (
              <CategoryChip key={`b-${label}-${i}`} label={label} iconSrc={iconSrc} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
