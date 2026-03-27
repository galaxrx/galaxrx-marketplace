import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import ScrollReveal from "@/components/landing/ScrollReveal";
import CategoryMarquee from "@/components/landing/CategoryMarquee";
import { PLATFORM, platformTelHref } from "@/lib/platform";
import FooterEnquiryForm from "@/components/landing/FooterEnquiryForm";

export const metadata: Metadata = {
  title: "GalaxRX — Verified B2B marketplace for Australian pharmacies",
  description:
    "Surplus and clearance between licensed pharmacies. List in minutes, buy verified stock, settle through Stripe with funds held until delivery. 3.5% on completed sales only.",
};

const CONTACT_PHONE_RAW = PLATFORM.phone.trim();
const CONTACT_TEL = platformTelHref(CONTACT_PHONE_RAW);

const HeroWallpaper = dynamic(
  () => import("@/components/landing/HeroWallpaper").then((m) => m.default),
  { ssr: true }
);

const LandingHeader = dynamic(
  () => import("@/components/landing/LandingHeader").then((m) => m.default),
  { ssr: true }
);

const LandingSlideshow = dynamic(
  () => import("@/components/landing/LandingSlideshow").then((m) => m.default),
  { ssr: true }
);

const FAQ_LANDING = [
  {
    q: "Who can use GalaxRX?",
    a: "Licensed Australian pharmacies only. Our team manually verifies every applicant — usually within 24 hours — before you can buy or sell.",
  },
  {
    q: "How much does it cost?",
    a: "Free to join, no subscription. GalaxRX charges 3.5% on completed sales only. Buyers pay no platform fee.",
  },
  {
    q: "How are payments handled?",
    a: "Checkout runs on Stripe. Buyer funds are held until delivery is confirmed, then released to the seller — so both sides have a clear, traceable settlement.",
  },
  {
    q: "What about short-dated or clearance stock?",
    a: "List it with the expiry visible on our Expiry Clearance board. Buyers searching for discounted lines can find it quickly so you recover value before stock expires.",
  },
  {
    q: "How do deliveries work?",
    a: "You arrange shipping or pickup directly with the other pharmacy. GalaxRX focuses on discovery, verification, and secure payment — you stay in control of logistics.",
  },
];

const VALUE_PROP = [
  {
    title: "Recover capital before write-offs",
    desc: "Move clearance and short-dated lines while they still have recoverable value.",
    icon: "capital" as const,
  },
  {
    title: "Buy from verified pharmacies",
    desc: "Source surplus from licensed peers — not anonymous marketplaces or grey channels.",
    icon: "verified" as const,
  },
  {
    title: "Settlement you can explain",
    desc: "Stripe holds buyer funds until delivery is confirmed, then releases to the seller.",
    icon: "checkout" as const,
  },
  {
    title: "No subscription economics",
    desc: "Join free. GalaxRX earns 3.5% only when a sale completes — aligned incentives.",
    icon: "fee" as const,
  },
];

const HOW_STEPS = [
  {
    title: "List in minutes",
    desc: "Scan a barcode or search by product, set quantity, price, and expiry — publish without a procurement-style workflow.",
    img: "/LIST.png",
    alt: "List surplus pharmacy stock quickly",
    stepIcon: "list" as const,
  },
  {
    title: "Surface to active buyers",
    desc: "Clearance and short-dated lines appear where buyers search — so surplus is seen before it ages out.",
    img: "/Verified%20stock.png",
    alt: "Verified pharmacy listings",
    stepIcon: "radar" as const,
  },
  {
    title: "Checkout with certainty",
    desc: "Stripe-powered payment: funds held until delivery confirms, then released — clarity for buyer and seller.",
    img: "/Secure%20payment.png",
    alt: "Secure Stripe payments between pharmacies",
    stepIcon: "lock" as const,
  },
  {
    title: "Close with peers",
    desc: "Every counterparty is a verified Australian pharmacy — B2B trading you can stand behind commercially.",
    img: "/Verified%20network.png",
    alt: "Verified pharmacy trading network",
    stepIcon: "peers" as const,
  },
];

const TRUST_ARCHITECTURE = [
  {
    title: "Pharmacy & business verification",
    desc: "Manual checks on Australian pharmacy licensing and legitimacy before anyone can list or purchase.",
  },
  {
    title: "Stripe settlement path",
    desc: "Card payments with funds held until delivery is confirmed — a release flow you can trace in Stripe.",
  },
  {
    title: "Expiry surfaced on listings",
    desc: "Short-dated and clearance stock is visible where buyers compare dates and price with intent.",
  },
  {
    title: "Audit-friendly money movement",
    desc: "From checkout to payout, the flow is designed for reconciliation — not opaque wallet balances.",
  },
  {
    title: "Logistics stay pharmacy-led",
    desc: "You arrange courier or pickup with the other pharmacy; GalaxRX handles discovery, verification, and payment.",
  },
];

const MARKET_PROOF = [
  {
    title: "What moves on the platform",
    desc: "Clearance batches, short-dated lines, and OTC surplus — listed with expiry in view when it matters to the trade.",
  },
  {
    title: "Who is allowed to trade",
    desc: "Licensed Australian pharmacies only. No retail accounts, no anonymous buyers — peers dealing with peers.",
  },
  {
    title: "How capital is released",
    desc: "Buyer pays through Stripe; funds stay held until delivery confirms, then settle to the seller — operational, not theoretical.",
  },
] as const;

const HERO_PROOF_SIGNALS = [
  { label: "Manual verify · typically <24h", sub: "Before first trade" },
  { label: "Funds held in Stripe", sub: "Until delivery confirms" },
  { label: "Dispatch: pharmacy-led", sub: "You set courier or pickup" },
] as const;

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5l7 3.2v5.4c0 4.5-3 8.7-7 9.8-4-1.1-7-5.3-7-9.8V6.7l7-3.2z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ValuePropIcon({ name }: { name: (typeof VALUE_PROP)[number]["icon"] }) {
  const common = "h-6 w-6 text-gold";
  const sw = 1.5;
  switch (name) {
    case "capital":
      /* Stacked coins — recovered value */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <ellipse cx="12" cy="17" rx="6.5" ry="2.3" />
          <ellipse cx="12" cy="13.5" rx="5.5" ry="2" />
          <ellipse cx="12" cy="10" rx="4.5" ry="1.8" />
        </svg>
      );
    case "verified":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3.5l7 3.2v5.4c0 4.5-3 8.7-7 9.8-4-1.1-7-5.3-7-9.8V6.7l7-3.2z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
        </svg>
      );
    case "checkout":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path strokeLinecap="round" d="M2 10h20" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 15h2M10 15h4" />
        </svg>
      );
    case "fee":
      /* Percent — pay only on sales */
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <circle cx="8" cy="9" r="2" />
          <circle cx="16" cy="15" r="2" />
          <path strokeLinecap="round" d="M15 8L9 16" />
        </svg>
      );
    default:
      return null;
  }
}

function HowStepGlyph({ kind }: { kind: (typeof HOW_STEPS)[number]["stepIcon"] }) {
  const c = "h-5 w-5 text-gold";
  const sw = 1.5;
  switch (kind) {
    case "list":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h5" />
          <rect x="3" y="5" width="3" height="14" rx="1" />
        </svg>
      );
    case "radar":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path strokeLinecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" />
        </svg>
      );
    case "lock":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path strokeLinecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
          <circle cx="12" cy="15" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      );
    case "peers":
      return (
        <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="16" cy="9" r="2.5" />
          <path strokeLinecap="round" d="M4 20v-1a5 5 0 0 1 5-5h1M15 14h1a5 5 0 0 1 5 5v1" />
        </svg>
      );
    default:
      return null;
  }
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden text-white">
      <div className="relative border-b border-white/[0.06]">
        <HeroWallpaper className="z-0" variant="calm" />
        <LandingHeader />

        {/* Hero — text + framed photo (not full-bleed background) */}
        <section className="relative z-10 overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10 lg:px-10 xl:px-14 2xl:px-16">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="landing-hero-orb-primary absolute -top-40 left-[5%] h-[min(28rem,80vw)] w-[min(28rem,80vw)] rounded-full bg-gold/18 blur-[100px]" />
            <div className="landing-hero-orb-secondary absolute top-0 -right-20 h-[min(22rem,70vw)] w-[min(22rem,70vw)] rounded-full bg-[#3d6fb8]/22 blur-[90px]" />
            <div className="absolute bottom-0 left-1/2 h-56 w-[130%] -translate-x-1/2 bg-gradient-to-t from-[#0D1B2A] via-transparent to-transparent opacity-95" />
          </div>

          <div className="mx-auto grid w-full max-w-[min(100%,1280px)] items-center gap-12 lg:grid-cols-2 lg:items-center lg:gap-14 xl:max-w-[min(100%,1400px)] xl:gap-16 2xl:gap-20">
            <div className="mx-auto w-full max-w-xl text-center lg:mx-0 lg:max-w-[28rem] lg:text-left xl:max-w-[30rem] 2xl:max-w-[34rem]">
              <p className="mb-5 inline-flex items-center rounded-full border border-gold/25 bg-white/[0.04] px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold shadow-[0_0_24px_-4px_rgba(201,168,76,0.35)] backdrop-blur-md ring-1 ring-white/[0.06] sm:text-[0.65rem]">
                Verified B2B marketplace · Australia
              </p>
              <h1 className="font-heading text-[1.95rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl md:text-[2.75rem] lg:text-[3.1rem] xl:text-[3.35rem]">
                <span className="block text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]">
                  Turn surplus stock into cash
                </span>
                <span className="mt-4 block max-w-xl bg-gradient-to-r from-gold via-[#e8d5a3] to-gold bg-clip-text text-[1.125rem] font-semibold leading-snug text-transparent sm:text-xl md:text-2xl lg:mx-0 lg:text-[1.75rem] lg:leading-[1.2]">
                  Before it expires — between verified pharmacies, not anonymous buyers.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/58 sm:text-[1.0625rem] lg:mx-0 lg:max-w-none">
                GalaxRX is the B2B layer for pharmacy surplus: list in minutes, discover verified stock, settle through Stripe.
                No retail storefronts — licensed peers only.
              </p>

              <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mx-auto sm:max-w-lg sm:flex-row sm:justify-center lg:mx-0 lg:max-w-none lg:justify-start">
                <Link
                  href="/register"
                  aria-label="Join GalaxRX — register as a verified pharmacy"
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-gold px-8 py-4 font-heading text-xs font-bold uppercase tracking-wide text-[#0D1B2A] shadow-[0_10px_32px_-8px_rgba(201,168,76,0.55)] transition-all duration-300 hover:bg-gold/92 hover:shadow-[0_14px_40px_-8px_rgba(201,168,76,0.65)] hover:-translate-y-0.5 active:translate-y-0 sm:text-sm"
                >
                  Join GalaxRX
                </Link>
                <Link
                  href="/listings"
                  aria-label="Browse pharmacy stock listings"
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-gold/45 bg-white/[0.04] px-8 py-4 font-heading text-xs font-semibold uppercase tracking-wide text-gold backdrop-blur-sm transition-all duration-300 hover:border-gold/60 hover:bg-white/[0.09] hover:shadow-[0_0_28px_-10px_rgba(201,168,76,0.25)] sm:text-sm"
                >
                  Browse listings
                </Link>
              </div>

              <ul className="mt-10 grid gap-2.5 sm:max-w-lg sm:grid-cols-1 sm:justify-items-center lg:max-w-none lg:justify-items-start" aria-label="How GalaxRX operates">
                {HERO_PROOF_SIGNALS.map((s) => (
                  <li
                    key={s.label}
                    className="flex w-full items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3 text-left backdrop-blur-sm transition-colors hover:border-gold/20 sm:items-center sm:py-3.5"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.08] sm:mt-0">
                      <ShieldCheckIcon className="h-4 w-4 text-gold" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.8125rem] font-semibold tracking-wide text-white/90 sm:text-sm">{s.label}</span>
                      <span className="mt-0.5 block text-[0.7rem] text-white/45 sm:text-xs">{s.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full min-w-0 max-w-xl lg:mx-0 lg:max-w-none lg:justify-self-stretch">
              <div
                className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-gold/35 via-white/10 to-transparent opacity-80 blur-[2px]"
                aria-hidden
              />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] border border-white/[0.1] bg-[#0a1522] shadow-[0_32px_72px_-32px_rgba(0,0,0,0.88),0_0_0_1px_rgba(255,255,255,0.05)] sm:aspect-[4/3] lg:aspect-[1/1] xl:aspect-[5/4]">
                <Image
                  src="/up.png"
                  alt="Pharmacy professional reviewing inventory — representing verified B2B surplus trading on GalaxRX"
                  fill
                  priority
                  className="object-cover object-[center_22%] sm:object-[center_30%] lg:object-[center_28%]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/95 via-[#0D1B2A]/25 to-transparent sm:from-[#0D1B2A]/88"
                  aria-hidden
                />
                <div className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] bg-[#0D1B2A]/55 p-4 backdrop-blur-md sm:p-5">
                  <div className="flex flex-wrap gap-2 sm:gap-2.5">
                    <span className="rounded-full border border-gold/25 bg-black/30 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-gold/95 sm:text-xs">
                      Proof at a glance
                    </span>
                    <span className="rounded-full border border-white/[0.1] bg-black/25 px-3 py-1 text-[0.65rem] font-medium text-white/75 sm:text-xs">
                      B2B · not retail
                    </span>
                    <span className="rounded-full border border-white/[0.1] bg-black/25 px-3 py-1 text-[0.65rem] font-medium text-white/75 sm:text-xs">
                      Stripe settlement
                    </span>
                  </div>
                  <p className="mt-3 font-heading text-sm font-semibold text-white sm:text-base">Built for dispensary owners</p>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-white/75">
                    Every account is verified before anyone buys or sells — commercial trading with a clear counterparty.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* Value proposition */}
        <ScrollReveal
          as="section"
          className="relative border-t border-white/[0.06] bg-[#0a111a] px-4 py-16 sm:px-6 sm:py-20 lg:px-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgba(201,168,76,0.07),transparent_60%)]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {VALUE_PROP.map((v, i) => (
              <ScrollReveal key={v.title} as="div" delay={i * 0.06}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111c2e]/95 to-[#0a1018] p-5 shadow-[0_16px_44px_-28px_rgba(0,0,0,0.6)] transition-all duration-500 hover:-translate-y-1.5 hover:border-gold/25 hover:shadow-[0_28px_56px_-24px_rgba(201,168,76,0.16)] sm:p-6">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_-20%,rgba(201,168,76,0.12),transparent_55%)]" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                  </div>
                  <div className="relative">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.08] text-gold shadow-[0_8px_24px_-12px_rgba(201,168,76,0.35)] ring-1 ring-white/[0.06] transition-transform duration-500 group-hover:scale-105 group-hover:border-gold/35 group-hover:bg-gold/[0.12]">
                      <ValuePropIcon name={v.icon} />
                    </div>
                    <p className="font-heading text-base font-bold text-white sm:text-lg">{v.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/55 transition-colors duration-300 group-hover:text-white/65">
                      {v.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </ScrollReveal>

        {/* Welcome offer */}
        <ScrollReveal as="section" className="border-t border-white/[0.06] bg-[#0D1B2A] px-4 py-12 sm:px-6 sm:py-14 lg:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.12] via-[#0c1828]/95 to-[#0a1522] px-5 py-6 shadow-[0_24px_56px_-28px_rgba(201,168,76,0.22)] sm:px-7 sm:py-7">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" aria-hidden />
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold/95 sm:text-xs">Limited welcome offer</p>
              <p className="mt-2 font-heading text-lg font-semibold leading-snug text-white text-balance sm:text-xl md:text-2xl">
                First 30 days: 0% GalaxRX fees on completed sales
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/50 sm:text-[0.9375rem]">
                New pharmacies pay <span className="font-medium text-white/80">no platform fee</span> for 30 days from signup — then{" "}
                <span className="font-medium text-gold/90">3.5%</span> on completed sales only. Buyers still pay no GalaxRX fee.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <CategoryMarquee />

        {/* How it works */}
        <section
          id="how-it-works"
          className="relative overflow-hidden border-t border-white/[0.06] bg-[#070f16] px-4 py-16 sm:px-6 sm:py-24 lg:px-10"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(201,168,76,0.05)_0%,transparent_45%)]"
            aria-hidden
          />
          <ScrollReveal as="div" className="relative mb-14 text-center sm:mb-16">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold/90 sm:text-xs">How it works</p>
            <h2 className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl md:text-4xl md:tracking-tight">
              One pipeline from shelf to settled payment
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/52 sm:text-[1.0625rem]">
              List, surface, pay, and close — four steps built for owners who cannot afford slow or opaque trades between
              pharmacies.
            </p>
            <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden />
          </ScrollReveal>
          <div className="relative mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 sm:gap-9 lg:gap-10">
            {HOW_STEPS.map((item, i) => (
              <ScrollReveal key={item.title} as="div" delay={i * 0.08} xOffset={i % 2 === 0 ? -16 : 16}>
                <div
                  className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/[0.1] bg-gradient-to-br from-[#111c2e]/98 to-[#0a1018] p-[1px] shadow-[0_28px_64px_-36px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.04] transition-all duration-500 hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-[0_36px_72px_-32px_rgba(201,168,76,0.18)] hover:ring-gold/15 lg:even:translate-y-8"
                >
                  <div className="relative overflow-hidden rounded-[1.3rem] bg-[#0a1522]">
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <span className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full border border-gold/25 bg-[#0D1B2A]/92 py-1.5 pl-1.5 pr-3 shadow-lg ring-1 ring-gold/25 backdrop-blur-sm sm:left-4 sm:top-4 sm:py-2 sm:pl-2 sm:pr-4">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/[0.12] font-heading text-xs font-bold tabular-nums text-gold sm:h-10 sm:w-10 sm:text-sm">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <HowStepGlyph kind={item.stepIcon} />
                      </span>
                      <Image
                        src={item.img}
                        alt={item.alt}
                        fill
                        className="object-cover object-center transition duration-700 ease-out group-hover:scale-[1.05]"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/75 via-[#0D1B2A]/10 to-transparent opacity-95 transition-opacity duration-500 group-hover:opacity-100"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,rgba(201,168,76,0.12),transparent_55%)]"
                        aria-hidden
                      />
                    </div>
                    <div className="relative px-5 pb-7 pt-5 sm:px-8 sm:pb-8 sm:pt-6">
                      <h3 className="font-heading text-xl font-bold text-white transition-colors duration-300 group-hover:text-gold/95 sm:text-2xl">
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-white/55 sm:text-[0.95rem]">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Trust */}
        <ScrollReveal
          as="section"
          id="trust"
          className="relative overflow-hidden border-t border-white/[0.06] bg-[#0a111a] px-4 py-16 sm:px-6 sm:py-24 lg:px-10"
        >
          <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-gold/[0.05] blur-[90px]" aria-hidden />
          <div className="relative mx-auto max-w-6xl">
            <div className="mb-12 text-center sm:mb-14">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold/90 sm:text-xs">Trust architecture</p>
              <h2 className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl md:text-4xl md:tracking-tight">
                Operational signals, not slogans
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/52 sm:text-[1.0625rem]">
                Verification, settlement, expiry visibility, and logistics responsibility — packaged the way a pharmacy
                owner actually runs the business.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {TRUST_ARCHITECTURE.slice(0, 3).map((t) => (
                <div
                  key={t.title}
                  className="rounded-2xl border border-white/[0.08] bg-[#0e1623]/95 p-6 shadow-[0_12px_36px_-24px_rgba(0,0,0,0.5)] transition-colors hover:border-gold/15"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.08] text-gold">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-white sm:text-lg">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{t.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:mt-5 lg:grid-cols-2 lg:gap-5">
              {TRUST_ARCHITECTURE.slice(3).map((t) => (
                <div
                  key={t.title}
                  className="rounded-2xl border border-white/[0.08] bg-[#0e1623]/95 p-6 shadow-[0_12px_36px_-24px_rgba(0,0,0,0.5)] transition-colors hover:border-gold/15 sm:min-h-[11rem]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.08] text-gold">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-white sm:text-lg">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Market proof — confidence without invented metrics */}
        <ScrollReveal
          as="section"
          className="relative overflow-hidden border-t border-white/[0.06] bg-[#050a12] px-4 py-16 sm:px-6 sm:py-24 lg:px-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(201,168,76,0.06),transparent_55%)]" aria-hidden />
          <div className="relative mx-auto max-w-6xl">
            <div className="mb-12 text-center sm:mb-14">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold/90 sm:text-xs">Market signal</p>
              <h2 className="mt-3 font-heading text-2xl font-bold text-white sm:text-3xl md:text-4xl md:tracking-tight">
                Built for inventory that cannot wait
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/52 sm:text-[1.0625rem]">
                The model is transparent: what trades, who is allowed in, and how money moves — so confidence comes from
                mechanics, not hype.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3 md:gap-6">
              {MARKET_PROOF.map((p) => (
                <div
                  key={p.title}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#101a28]/98 to-[#0a1018] p-6 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.55)] sm:p-7"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent" aria-hidden />
                  <h3 className="font-heading text-lg font-bold text-white sm:text-xl">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/52 sm:text-[0.9375rem]">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Fee model */}
        <ScrollReveal
          as="section"
          className="relative overflow-hidden border-t border-white/[0.06] bg-[#0D1B2A] px-4 py-16 sm:py-24 lg:px-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_45%,rgba(201,168,76,0.1),transparent_65%)]" aria-hidden />
          <div className="landing-fee-glow pointer-events-none absolute left-1/2 top-1/2 h-[min(32rem,90vw)] w-[min(32rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/12 blur-[100px]" aria-hidden />
          <div className="relative z-[1] mx-auto max-w-4xl">
            <p className="text-center font-heading text-xs font-semibold uppercase tracking-[0.28em] text-gold/90">Pricing</p>
            <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-gold/25 bg-gradient-to-br from-[#142236]/95 via-[#0c1828] to-[#0a1522] p-[1px] shadow-[0_32px_64px_-36px_rgba(201,168,76,0.2)]">
              <div className="relative rounded-[1.7rem] bg-[#0D1B2A]/95 px-6 py-10 sm:px-10 sm:py-12">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" aria-hidden />
                <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
                  <div className="text-center lg:text-left">
                    <p className="font-heading text-[clamp(3.5rem,12vw,5.5rem)] font-bold leading-none tracking-tight text-gold [text-shadow:0_0_48px_rgba(201,168,76,0.35)]">
                      3.5%
                    </p>
                    <p className="mt-3 font-heading text-base font-semibold uppercase tracking-[0.2em] text-white sm:text-lg">
                      On completed sales only
                    </p>
                    <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/50 lg:mx-0 sm:text-base">
                      The anchor to remember: GalaxRX earns when your trade clears — not when you list or browse.
                    </p>
                  </div>
                  <ul className="mx-auto w-full max-w-md space-y-3.5 text-left text-sm text-white/75 sm:text-[0.9375rem] lg:mx-0 lg:max-w-sm">
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/80" aria-hidden />
                      <span>
                        <span className="font-semibold text-white">No subscription</span> — join and list without a monthly
                        platform charge.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/80" aria-hidden />
                      <span>
                        <span className="font-semibold text-white">Buyers pay $0</span> GalaxRX fee — discovery stays on the
                        buy side without a platform uplift.
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold/80" aria-hidden />
                      <span>
                        <span className="font-semibold text-white">Stripe at checkout</span> — card payments with a
                        settlement path you can point finance at.
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-white/[0.06] pt-8 lg:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white/80 backdrop-blur-sm sm:text-sm">
                    <ShieldCheckIcon className="h-4 w-4 shrink-0 text-gold" />
                    Payments processed with Stripe
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/[0.06] px-4 py-2.5 text-xs font-medium text-gold/95 sm:text-sm">
                    First 30 days: 0% platform fee for new pharmacies
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Premium surplus — full-bleed slides + left gradient overlay (previous hero style) */}
        <ScrollReveal as="section" className="relative border-t border-white/[0.06] bg-[#070F18]">
          <LandingSlideshow variant="fullBleed">
            <div className="mx-auto w-full max-w-3xl text-center lg:mx-0 lg:text-left">
              <h2 className="font-heading text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
                Premium surplus trading,
                <span className="block bg-gradient-to-r from-gold to-[#dfc88a] bg-clip-text text-transparent">
                  without the noise.
                </span>
              </h2>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="inline-flex min-h-[2.75rem] min-w-[11rem] items-center justify-center rounded-2xl bg-gold px-8 py-3.5 font-heading text-xs font-bold uppercase tracking-wide text-[#0D1B2A] shadow-lg transition-all hover:bg-gold/92 sm:text-sm"
                >
                  Join GalaxRX
                </Link>
                <Link
                  href="/listings"
                  className="inline-flex min-h-[2.75rem] min-w-[11rem] items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-8 py-3.5 font-heading text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition-all hover:bg-white/15 sm:text-sm"
                >
                  Browse listings
                </Link>
              </div>
            </div>
          </LandingSlideshow>
        </ScrollReveal>

        {/* FAQ */}
        <ScrollReveal
          as="section"
          id="faq"
          className="relative overflow-hidden border-t border-white/[0.06] bg-[#0a111a] px-4 py-14 sm:py-20 lg:px-10"
        >
          <div className="pointer-events-none absolute left-0 top-1/3 h-64 w-64 rounded-full bg-gold/[0.04] blur-[80px]" aria-hidden />
          <div className="relative mx-auto w-full max-w-2xl">
            <h2 className="mb-10 text-center font-heading text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
              <span className="block text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.25)]">Questions</span>
              <span className="mt-1 block bg-gradient-to-r from-gold via-[#dfc88a] to-gold bg-clip-text text-transparent">
                answered.
              </span>
            </h2>
            <div className="space-y-3">
              {FAQ_LANDING.map(({ q, a }, i) => (
                <details
                  key={q}
                  open={i === 0}
                  className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1623]/95 shadow-[0_10px_36px_-24px_rgba(0,0,0,0.45)] transition-[border-color,box-shadow] duration-300 open:border-gold/25 open:shadow-[0_14px_44px_-20px_rgba(201,168,76,0.12)] hover:border-white/[0.12]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 select-none transition-colors hover:bg-white/[0.03] sm:px-6 sm:py-4">
                    <span className="text-left font-heading text-sm font-semibold leading-snug text-white sm:text-base">{q}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gold/15 bg-gold/[0.06] text-gold/90 transition-all duration-300 group-open:rotate-180 group-open:border-gold/30 group-open:bg-gold/10">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </summary>
                  <div className="border-t border-white/[0.06] bg-black/15 px-5 pb-5 pt-0 sm:px-6">
                    <p className="pt-4 text-sm leading-relaxed text-white/55">{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Final CTA */}
        <ScrollReveal
          as="section"
          className="landing-cta-sheen relative overflow-hidden border-t border-white/20 bg-gradient-to-br from-gold via-[#c9a84c] to-[#b08d3a] px-4 py-14 text-center shadow-[0_-12px_40px_-20px_rgba(201,168,76,0.25)] sm:px-6 sm:py-16"
        >
          <div className="relative z-[1] mx-auto w-full max-w-2xl">
            <h2 className="mb-3 font-heading text-2xl font-bold uppercase tracking-wide text-[#1a1408] sm:text-3xl [text-shadow:0_1px_0_rgba(255,255,255,0.2)]">
              Ready to move surplus with certainty?
            </h2>
            <p className="mb-10 text-sm leading-relaxed text-[#2c2415] sm:text-base">
              Register your pharmacy, clear verification, then list or buy alongside peers — GalaxRX is paid only when a
              sale completes.
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-[#1e160c] px-10 py-4 font-heading text-xs font-bold uppercase tracking-wide text-gold shadow-[0_10px_28px_-8px_rgba(0,0,0,0.45)] transition-all hover:bg-[#2a2114] hover:-translate-y-0.5 sm:text-sm"
              >
                Join GalaxRX
              </Link>
              <Link
                href="/listings"
                className="inline-flex items-center justify-center rounded-2xl border-2 border-[#1e160c]/80 bg-transparent px-10 py-4 font-heading text-xs font-bold uppercase tracking-wide text-[#1e160c] transition-all hover:bg-[#1e160c]/10 sm:text-sm"
              >
                Browse listings
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* Footer */}
        <footer
          id="footer-enquiry"
          className="scroll-mt-24 border-t border-white/[0.08] bg-[#070F18] px-4 py-12 sm:px-6 sm:py-14 lg:px-10"
        >
          <div className="mx-auto grid max-w-none grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14 xl:gap-16">
            <div className="max-w-sm lg:col-span-3">
              <p className="mb-2 font-heading text-lg font-bold text-gold">GalaxRX</p>
              <div className="relative mb-4 h-10 w-28">
                <Image src="/logo.png" alt="GalaxRX" fill className="object-contain object-left" sizes="112px" />
              </div>
              <p className="text-sm leading-relaxed text-white/50">
                B2B marketplace for licensed Australian pharmacies. Verified trading, Stripe settlement, 3.5% per
                completed sale — no subscription.
              </p>
              <p className="mt-6 text-xs text-white/35">© {new Date().getFullYear()} GalaxRX. All rights reserved.</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Connect</span>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={PLATFORM.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/55 transition-colors hover:border-gold/30 hover:text-gold"
                    aria-label="GalaxRX on Instagram"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="18" cy="6" r="1.25" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                  <a
                    href={PLATFORM.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/55 transition-colors hover:border-gold/30 hover:text-gold"
                    aria-label="GalaxRX on LinkedIn"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <path d="M2 9h4v12H2z" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </a>
                  {CONTACT_TEL ? (
                    <a
                      href={`tel:${CONTACT_TEL}`}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-sm text-white/55 transition-colors hover:border-gold/30 hover:text-gold"
                      aria-label={`Call ${CONTACT_PHONE_RAW}`}
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 1 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span className="max-w-[11rem] truncate">{CONTACT_PHONE_RAW}</span>
                    </a>
                  ) : (
                    <a
                      href={`mailto:${PLATFORM.email}?subject=${encodeURIComponent("Phone enquiry — GalaxRX")}`}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-sm text-white/55 transition-colors hover:border-gold/30 hover:text-gold"
                      aria-label="Request phone number by email"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 1 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      Phone
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold/90">Enquiry</p>
              <p className="mb-6 text-sm leading-relaxed text-white/60">
                For general enquiries and advertising, contact us at{" "}
                <a href={`mailto:${PLATFORM.email}`} className="text-gold hover:text-gold/90 hover:underline">
                  {PLATFORM.email}
                </a>
                , or use the form below — we&apos;ll email you back.
              </p>
              <FooterEnquiryForm contactEmail={PLATFORM.email} />
            </div>

            <div className="flex flex-wrap gap-12 text-sm lg:col-span-4 lg:justify-end">
              <div>
                <p className="mb-3 font-semibold text-gold/80">Why GalaxRX</p>
                <Link href="/why-galaxrx" className="mb-2 block text-white/50 transition-colors hover:text-white">
                  Why GalaxRX
                </Link>
                <Link href="/solutions" className="mb-2 block text-white/50 transition-colors hover:text-white">
                  Solutions
                </Link>
                <Link href="/listings" className="mb-2 block text-white/50 transition-colors hover:text-white">
                  Browse listings
                </Link>
                <Link href="/register" className="mb-2 block text-white/50 transition-colors hover:text-white">
                  Join GalaxRX
                </Link>
                <Link href="/login" className="block text-white/50 transition-colors hover:text-white">
                  Sign in
                </Link>
              </div>
              <div>
                <p className="mb-3 font-semibold text-gold/80">Legal &amp; about</p>
                <Link href="/about" className="mb-2 block text-white/50 transition-colors hover:text-white">
                  About GalaxRX
                </Link>
                <Link href="/terms" className="mb-2 block text-white/50 transition-colors hover:text-white">
                  Terms of service
                </Link>
                <Link href="/privacy" className="mb-2 block text-white/50 transition-colors hover:text-white">
                  Privacy policy
                </Link>
                <a href="#footer-enquiry" className="block text-white/50 transition-colors hover:text-white">
                  Contact us
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
