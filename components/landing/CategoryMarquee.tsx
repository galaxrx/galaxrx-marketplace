import type { ReactNode } from "react";

const SW = 1.5;

function IconPill({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <rect x="6" y="9" width="12" height="8" rx="2" />
      <path strokeLinecap="round" d="M9 9V8a3 3 0 0 1 6 0v1" />
    </svg>
  );
}
function IconHeart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.65-7 10-7 10z"
      />
    </svg>
  );
}
function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 4.5 11 9l4.5 1.5L11 12l-1.5 4.5L8 12 3.5 10.5 8 9zM18 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
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
function IconScissors({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <circle cx="7" cy="7" r="3" />
      <circle cx="17" cy="17" r="3" />
      <path strokeLinecap="round" d="m6.5 17.5 11-11" />
    </svg>
  );
}
function IconSmile({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path strokeLinecap="round" d="M9 9h.01M15 9h.01" />
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
function IconCross({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M8 7h8M8 17h8" />
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
    </svg>
  );
}
function IconBandage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8 8 8 8M9 9l6 6M8 16l8-8" />
      <rect x="5" y="5" width="14" height="14" rx="2" transform="rotate(45 12 12)" />
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
function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={SW} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

const CATEGORIES: readonly { label: string; icon: (p: { className?: string }) => ReactNode }[] = [
  { label: "Vitamins & Supplements", icon: IconPill },
  { label: "Pregnancy & Baby", icon: IconHeart },
  { label: "Cosmetics", icon: IconSparkles },
  { label: "Skincare", icon: IconDroplet },
  { label: "Hair Care", icon: IconScissors },
  { label: "Oral Care", icon: IconSmile },
  { label: "Personal Care", icon: IconUser },
  { label: "Medicines", icon: IconCross },
  { label: "First Aid", icon: IconBandage },
  { label: "Sport & Fitness", icon: IconDumbbell },
  { label: "Home & Pet", icon: IconHome },
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

      <div className="relative mx-auto max-w-6xl px-4 pb-3 pt-8 text-center sm:px-6 sm:pt-10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold/90 sm:text-xs">Depth of stock</p>
        <h2 className="mt-2 font-heading text-lg font-bold text-white text-balance sm:text-xl md:text-2xl">
          Non‑prescription lines pharmacies actually move
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-white/45 sm:text-[0.9375rem]">
          A live slice of the surplus and clearance categories peers list — OTC, front-of-shop, and health essentials.
        </p>
      </div>

      <div className="relative space-y-3 pb-8 sm:space-y-3.5 sm:pb-10" aria-hidden="true">
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
