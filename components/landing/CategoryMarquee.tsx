import type { ReactNode } from "react";

const SW = 1.5;

/** Vitamins — bottle with pills */
function IconBottlePills({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 3h4v3l2 2v14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8l2-2V3z" />
      <ellipse cx="9" cy="17" rx="1.2" ry="0.7" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="18.5" rx="1.2" ry="0.7" fill="currentColor" stroke="none" />
      <ellipse cx="15" cy="17" rx="1.2" ry="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Pregnancy & Baby */
function IconBaby({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <circle cx="12" cy="9" r="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" />
      <path strokeLinecap="round" d="M9.5 8h.01M14.5 8h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11a2 2 0 0 0 4 0" />
    </svg>
  );
}

/** Cosmetics — lipstick */
function IconLipstick({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 3h4v6h-4V3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6v11a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V9z" />
      <path strokeLinecap="round" d="M11 14h2" />
    </svg>
  );
}

function IconDroplet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z"
      />
    </svg>
  );
}

/** Hair care — comb */
function IconComb({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4l12 12-2 2L6 6l2-2z" />
      <path strokeLinecap="round" d="M10 8l1 1M12 10l1 1M14 12l1 1M16 14l1 1" />
    </svg>
  );
}

/** Oral care — toothbrush */
function IconToothbrush({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <rect x="5" y="5" width="14" height="7" rx="1.5" />
      <path strokeLinecap="round" d="M7.5 7.5h9M7.5 9.5h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v8" />
      <circle cx="12" cy="21" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
    </svg>
  );
}

/** Medicines — pills */
function IconPills({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <ellipse cx="9" cy="12" rx="4" ry="2.2" transform="rotate(-25 9 12)" />
      <ellipse cx="15" cy="13" rx="4" ry="2.2" transform="rotate(25 15 13)" />
    </svg>
  );
}

/** First aid — medical cross */
function IconMedicalCross({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconDumbbell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" d="M4 10h2v4H4M18 10h2v4h-2M7 9h10v6H7zM6 8v8M18 8v8" />
    </svg>
  );
}

/** Home & Pet — dog */
function IconDog({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 12c0-2 1.5-4 3.5-4h5c2 0 3.5 2 3.5 4v2c0 3-2.5 6-6 6s-6-3-6-6v-2z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 8V6l2-1 2 1.5L14 6l2 1v2" />
      <path strokeLinecap="round" d="M9.5 13h.01M14.5 13h.01" />
      <path strokeLinecap="round" d="M10.5 15.5h3" />
    </svg>
  );
}

const CATEGORIES: readonly { label: string; icon: (p: { className?: string }) => ReactNode }[] = [
  { label: "Vitamins & Supplements", icon: IconBottlePills },
  { label: "Pregnancy & Baby", icon: IconBaby },
  { label: "Cosmetics", icon: IconLipstick },
  { label: "Skincare", icon: IconDroplet },
  { label: "Hair Care", icon: IconComb },
  { label: "Oral Care", icon: IconToothbrush },
  { label: "Personal Care", icon: IconUser },
  { label: "Medicines", icon: IconPills },
  { label: "First Aid", icon: IconMedicalCross },
  { label: "Sport & Fitness", icon: IconDumbbell },
  { label: "Home & Pet", icon: IconDog },
];

function CategoryChip({ label, Icon }: { label: string; Icon: (typeof CATEGORIES)[number]["icon"] }) {
  return (
    <span className="category-chip group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-white/[0.1] bg-gradient-to-b from-white/[0.09] to-white/[0.02] py-2.5 pl-3 pr-5 shadow-[0_6px_28px_-10px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.07)] backdrop-blur-md transition-[border-color,box-shadow,transform,color] duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_12px_36px_-14px_rgba(201,168,76,0.28)] sm:gap-3 sm:py-3 sm:pl-3.5 sm:pr-6">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/[0.09] text-gold transition-[border-color,background-color,transform] duration-300 group-hover:scale-105 group-hover:border-gold/35 group-hover:bg-gold/[0.14] sm:h-9 sm:w-9">
        <Icon className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
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
            {loop.map(({ label, icon }, i) => (
              <CategoryChip key={`a-${label}-${i}`} label={label} Icon={icon} />
            ))}
          </div>
        </div>
        <div className="overflow-hidden py-1">
          <div className="marquee-category-track marquee-category-track-reverse flex w-max items-center gap-3 pr-3 sm:gap-4 sm:pr-4">
            {loop.map(({ label, icon }, i) => (
              <CategoryChip key={`b-${label}-${i}`} label={label} Icon={icon} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
