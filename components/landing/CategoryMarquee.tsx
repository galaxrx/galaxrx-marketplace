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

/** Pregnancy & Baby — baby (big head, arms, swaddle) */
function IconBaby({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <circle cx="12" cy="9" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9L6 10.5M16 9l2 1.5" />
      <path strokeLinecap="round" d="M9.5 8h.01M14.5 8h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 11a2 2 0 0 0 4 0" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 20.5c0-3.5 2.8-6 5.5-6s5.5 2.5 5.5 6" />
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12-2 2L4 8l2-2z" />
      <path strokeLinecap="round" d="M7 8l1 1M9 10l1 1M11 12l1 1M13 14l1 1" />
    </svg>
  );
}

/** Oral care — toothpaste tube */
function IconToothpaste({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 6h8l1 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l1-3z"
      />
      <path strokeLinecap="round" d="M9 9h6M9 12h6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4v2h-4z" />
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

/** First aid — kit (box + cross) */
function IconFirstAidKit({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10V8a3 3 0 0 1 6 0v2" />
      <path strokeLinecap="round" d="M12 13v4M10 15h4" />
    </svg>
  );
}

/** Sport — dumbbell */
function IconDumbbell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <rect x="3" y="9" width="6" height="6" rx="1.5" />
      <rect x="15" y="9" width="6" height="6" rx="1.5" />
      <path strokeLinecap="round" d="M9 12h6" strokeWidth={2.25} />
    </svg>
  );
}

/** Home & Pet — dog (floppy ears + muzzle, reads clearly at 16px) */
function IconDog({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <ellipse cx="8.5" cy="7.5" rx="2.2" ry="3" transform="rotate(-15 8.5 7.5)" />
      <ellipse cx="15.5" cy="7.5" rx="2.2" ry="3" transform="rotate(15 15.5 7.5)" />
      <ellipse cx="12" cy="13" rx="5" ry="4.5" />
      <ellipse cx="12" cy="14.5" rx="2.5" ry="2" />
      <circle cx="9.5" cy="12" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12" r="0.7" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" d="M10 16h4" />
      <path strokeLinecap="round" d="M12 16.5v2" />
    </svg>
  );
}

const CATEGORIES: readonly { label: string; icon: (p: { className?: string }) => ReactNode }[] = [
  { label: "Vitamins & Supplements", icon: IconBottlePills },
  { label: "Pregnancy & Baby", icon: IconBaby },
  { label: "Cosmetics", icon: IconLipstick },
  { label: "Skincare", icon: IconDroplet },
  { label: "Hair Care", icon: IconComb },
  { label: "Oral Care", icon: IconToothpaste },
  { label: "Personal Care", icon: IconUser },
  { label: "Medicines", icon: IconPills },
  { label: "First Aid", icon: IconFirstAidKit },
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
