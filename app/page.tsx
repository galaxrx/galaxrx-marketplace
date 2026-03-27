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
    "Trade pharmacy surplus and clearance with verified peers. List in minutes, browse verified stock, settle with Stripe. 3.5% on completed sales only — no subscription.",
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
    title: "Recover capital",
    desc: "Move clearance and short-dated lines before they become write-offs.",
  },
  {
    title: "Buy verified stock",
    desc: "Source surplus from licensed pharmacies — not the open internet.",
  },
  {
    title: "Secure checkout",
    desc: "Stripe holds funds until delivery is confirmed, then releases payment.",
  },
  {
    title: "No subscription",
    desc: "Join free. Pay 3.5% only when a sale completes — nothing else.",
  },
];

const HOW_STEPS = [
  {
    title: "List surplus",
    desc: "Scan a barcode or search by name, set quantity, price, and expiry, and publish in minutes — without long forms.",
    img: "/LIST.png",
    alt: "List surplus pharmacy stock quickly",
  },
  {
    title: "Get discovered",
    desc: "Clearance and short-dated lines surface to buyers who are actively sourcing — so surplus does not sit unseen.",
    img: "/Verified%20stock.png",
    alt: "Verified pharmacy listings",
  },
  {
    title: "Trade securely",
    desc: "Stripe-powered checkout with funds held until delivery confirms — payment certainty for both sides.",
    img: "/Secure%20payment.png",
    alt: "Secure Stripe payments between pharmacies",
  },
  {
    title: "Move surplus faster",
    desc: "Every counterparty is a verified Australian pharmacy — peer-to-peer trading you can stand behind.",
    img: "/Verified%20network.png",
    alt: "Verified pharmacy trading network",
  },
];

const TRUST_POINTS = [
  {
    title: "Licensed pharmacies only",
    desc: "Onboarding checks that you are a legitimate Australian pharmacy before you can trade.",
  },
  {
    title: "Verified network",
    desc: "Buy and sell knowing both sides are peers — not consumers or anonymous accounts.",
  },
  {
    title: "Expiry & clearance visibility",
    desc: "Short-dated and clearance stock is easy to find when buyers need to fill gaps affordably.",
  },
  {
    title: "Stripe-backed settlement",
    desc: "Card payments and held funds give a clear audit trail from checkout to release.",
  },
];

const TRUST_BADGES = ["Verified pharmacies only", "B2B marketplace", "Stripe-secured payments"] as const;

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

export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden text-white">
      <div className="relative border-b border-white/[0.06]">
        <HeroWallpaper className="z-0" variant="calm" />
        <LandingHeader />

        {/* Hero */}
        <section className="relative z-10 overflow-hidden px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-10 xl:px-12">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="landing-hero-orb-primary absolute -top-40 left-[5%] h-[min(28rem,80vw)] w-[min(28rem,80vw)] rounded-full bg-gold/18 blur-[100px]" />
            <div className="landing-hero-orb-secondary absolute top-0 -right-20 h-[min(22rem,70vw)] w-[min(22rem,70vw)] rounded-full bg-[#3d6fb8]/22 blur-[90px]" />
            <div className="absolute bottom-0 left-1/2 h-56 w-[130%] -translate-x-1/2 bg-gradient-to-t from-[#0D1B2A] via-transparent to-transparent opacity-95" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14 xl:gap-16">
            <div className="text-center lg:text-left">
              <p className="mb-4 inline-flex items-center rounded-full border border-gold/25 bg-white/[0.04] px-3.5 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold shadow-[0_0_24px_-4px_rgba(201,168,76,0.35)] backdrop-blur-md ring-1 ring-white/[0.06] sm:text-[0.65rem]">
                Verified B2B marketplace
              </p>
              <h1 className="font-heading text-[1.85rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl md:text-5xl lg:text-[3.15rem] xl:text-[3.35rem]">
                <span className="block text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]">
                  Surplus and clearance,
                </span>
                <span className="mt-2 block bg-gradient-to-r from-gold via-[#e8d5a3] to-gold bg-clip-text italic text-transparent drop-shadow-[0_0_28px_rgba(201,168,76,0.35)]">
                  traded between pharmacies.
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg lg:mx-0">
                GalaxRX is where licensed Australian pharmacies recover capital on excess inventory and source verified
                stock — with Stripe-secured settlement and a fee only when you sell.
              </p>

              <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/register"
                  aria-label="Join GalaxRX — register as a verified pharmacy"
                  className="inline-flex items-center justify-center rounded-2xl bg-gold px-7 py-4 font-heading text-xs font-bold uppercase tracking-wide text-[#0D1B2A] shadow-[0_10px_32px_-8px_rgba(201,168,76,0.55)] transition-all duration-300 hover:bg-gold/92 hover:shadow-[0_14px_40px_-8px_rgba(201,168,76,0.65)] hover:-translate-y-0.5 active:translate-y-0 sm:text-sm"
                >
                  Join now
                </Link>
                <Link
                  href="/listings"
                  aria-label="Browse pharmacy stock listings"
                  className="inline-flex items-center justify-center rounded-2xl border border-gold/45 bg-white/[0.04] px-7 py-4 font-heading text-xs font-semibold uppercase tracking-wide text-gold backdrop-blur-sm transition-all duration-300 hover:border-gold/60 hover:bg-white/[0.09] hover:shadow-[0_0_28px_-10px_rgba(201,168,76,0.25)] sm:text-sm"
                >
                  Browse listings
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start" aria-label="Trust signals">
                {TRUST_BADGES.map((b) => (
                  <li
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-black/20 px-3 py-1.5 text-[0.7rem] font-medium text-white/75 backdrop-blur-sm sm:text-xs"
                  >
                    <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0 text-gold" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="pointer-events-none absolute -inset-px rounded-[1.35rem] bg-gradient-to-br from-gold/35 via-white/10 to-transparent opacity-80 blur-[2px]" aria-hidden />
              <div className="relative aspect-[5/4] overflow-hidden rounded-[1.25rem] border border-white/[0.1] bg-[#0a1522] shadow-[0_28px_64px_-28px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.05)] sm:aspect-[4/3] lg:aspect-[5/4]">
                <Image
                  src="/up.jpg"
                  alt="Pharmacy professional reviewing inventory — representing verified B2B surplus trading on GalaxRX"
                  fill
                  priority
                  className="object-cover object-[center_22%] sm:object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/95 via-[#0D1B2A]/25 to-transparent sm:from-[#0D1B2A]/90"
                  aria-hidden
                />
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <p className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-gold/95">Built for pharmacies</p>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-white/85">
                    Commercial trading — not retail. Every account is verified before anyone buys or sells.
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
          className="relative border-t border-white/[0.06] bg-[#0a111a] px-4 py-14 sm:px-6 sm:py-16 lg:px-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_0%,rgba(201,168,76,0.07),transparent_60%)]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {VALUE_PROP.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111c2e]/90 to-[#0c1522] p-5 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.55)] transition-all duration-300 hover:border-gold/20 hover:shadow-[0_20px_48px_-24px_rgba(201,168,76,0.12)]"
              >
                <p className="font-heading text-base font-bold text-white sm:text-lg">{v.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{v.desc}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Welcome offer */}
        <ScrollReveal as="section" className="border-t border-white/[0.06] bg-[#0D1B2A] px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.12] via-[#0c1828]/95 to-[#0a1522] px-5 py-5 shadow-[0_24px_56px_-28px_rgba(201,168,76,0.22)] sm:px-6 sm:py-6">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" aria-hidden />
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gold/95 sm:text-xs">Limited welcome offer</p>
              <p className="mt-2 font-heading text-lg font-semibold leading-snug text-white text-balance sm:text-xl md:text-2xl">
                Your first 30 days: zero GalaxRX transaction fees
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                New pharmacies pay <span className="font-medium text-white/75">0% platform fees</span> for 30 days from signup
                — then our standard <span className="text-white/70">3.5%</span> on completed sales only.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <CategoryMarquee />

        {/* How it works */}
        <section
          id="how-it-works"
          className="relative overflow-hidden border-t border-white/[0.06] bg-[#0D1B2A] px-4 py-14 sm:px-6 sm:py-20 lg:px-10"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(201,168,76,0.04)_0%,transparent_40%)]"
            aria-hidden
          />
          <ScrollReveal as="div" className="relative mb-12 text-center">
            <h2 className="font-heading text-2xl font-bold uppercase tracking-[0.14em] text-white sm:text-3xl md:text-4xl">
              How GalaxRX works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/55">
              From listing to settlement — built for pharmacy owners and buyers who need speed and certainty.
            </p>
            <div className="mx-auto mt-6 h-px w-20 bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden />
          </ScrollReveal>
          <div className="relative mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:gap-6">
            {HOW_STEPS.map((item, i) => (
              <ScrollReveal key={item.title} as="div" delay={i * 0.06}>
                <div className="group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111c2e]/95 to-[#0e1623] p-6 shadow-[0_20px_48px_-32px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-gold/22 hover:shadow-[0_28px_56px_-28px_rgba(201,168,76,0.14)] sm:p-7">
                  <div className="relative mb-5 aspect-[16/10] w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a1522] ring-1 ring-white/[0.04]">
                    <Image
                      src={item.img}
                      alt={item.alt}
                      fill
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-white transition-colors duration-300 group-hover:text-gold/95">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Trust */}
        <ScrollReveal
          as="section"
          id="trust"
          className="relative overflow-hidden border-t border-white/[0.06] bg-[#0a111a] px-4 py-14 sm:px-6 sm:py-20 lg:px-10"
        >
          <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-gold/[0.05] blur-[90px]" aria-hidden />
          <div className="relative mx-auto max-w-6xl">
            <div className="mb-10 text-center sm:mb-12">
              <h2 className="font-heading text-2xl font-bold text-white sm:text-3xl md:text-4xl">Why pharmacies trust GalaxRX</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-white/55">
                Verification, transparency, and payments you can explain to your accountant — not a consumer app bolted
                onto wholesale.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {TRUST_POINTS.map((t) => (
                <div
                  key={t.title}
                  className="rounded-2xl border border-white/[0.08] bg-[#0e1623]/95 p-5 shadow-[0_12px_36px_-24px_rgba(0,0,0,0.5)] transition-colors hover:border-gold/15"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.08] text-gold">
                    <ShieldCheckIcon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-white sm:text-lg">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Fee model */}
        <ScrollReveal
          as="section"
          className="relative overflow-hidden border-t border-white/[0.06] bg-[#0D1B2A] px-4 py-14 sm:py-20 lg:px-10"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_45%,rgba(201,168,76,0.1),transparent_65%)]" aria-hidden />
          <div className="landing-fee-glow pointer-events-none absolute left-1/2 top-1/2 h-[min(32rem,90vw)] w-[min(32rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/12 blur-[100px]" aria-hidden />
          <div className="relative z-[1] mx-auto max-w-2xl text-center">
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.28em] text-gold/90">Simple economics</p>
            <p className="mt-4 font-heading text-5xl font-bold leading-none tracking-tight text-gold [text-shadow:0_0_48px_rgba(201,168,76,0.35)] sm:text-6xl md:text-7xl">
              3.5%
            </p>
            <p className="mt-4 font-heading text-base font-semibold uppercase tracking-[0.18em] text-white sm:text-lg">
              On completed sales only
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/55 sm:text-base">
              No monthly fee. No listing charges. Buyers pay no GalaxRX fee — the platform succeeds when your trades do.
            </p>
            <div className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-white/[0.04] px-5 py-3 text-sm text-white/80 backdrop-blur-sm">
              <ShieldCheckIcon className="h-5 w-5 shrink-0 text-gold" />
              <span>Payments processed securely with Stripe</span>
            </div>
          </div>
        </ScrollReveal>

        {/* Featured visual */}
        <ScrollReveal as="section" className="relative border-t border-white/[0.06] bg-[#070F18]">
          <div className="relative min-h-[320px] sm:min-h-[380px] lg:min-h-[420px]">
            <div className="absolute inset-0" aria-hidden>
              <Image
                src="/up.jpg"
                alt=""
                fill
                className="object-cover object-[center_25%]"
                sizes="100vw"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A]/95 via-[#0D1B2A]/75 to-[#0D1B2A]/55" aria-hidden />
            <div className="relative z-[1] flex min-h-[320px] flex-col justify-center px-4 py-14 sm:min-h-[380px] sm:px-8 lg:min-h-[420px] lg:px-16">
              <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-left">
                <h2 className="font-heading text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl">
                  Premium surplus trading,
                  <span className="block bg-gradient-to-r from-gold to-[#dfc88a] bg-clip-text text-transparent">
                    without the noise.
                  </span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/70 lg:mx-0">
                  One place to list clearance, discover verified stock, and close with confidence — so your team spends
                  less time chasing buyers and more time on patient care.
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                  <Link
                    href="/register"
                    className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl bg-gold px-8 py-3.5 font-heading text-xs font-bold uppercase tracking-wide text-[#0D1B2A] shadow-lg transition-all hover:bg-gold/92 sm:text-sm"
                  >
                    Join now
                  </Link>
                  <Link
                    href="/listings"
                    className="inline-flex min-w-[11rem] items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-8 py-3.5 font-heading text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm transition-all hover:bg-white/15 sm:text-sm"
                  >
                    Browse listings
                  </Link>
                </div>
              </div>
            </div>
          </div>
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
              Ready to trade smarter?
            </h2>
            <p className="mb-10 text-sm leading-relaxed text-[#2c2415] sm:text-base">
              Register your pharmacy, pass verification, then list or buy surplus alongside peers — pay only when you
              sell.
            </p>
            <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-2xl bg-[#1e160c] px-10 py-4 font-heading text-xs font-bold uppercase tracking-wide text-gold shadow-[0_10px_28px_-8px_rgba(0,0,0,0.45)] transition-all hover:bg-[#2a2114] hover:-translate-y-0.5 sm:text-sm"
              >
                Join now
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
                  Join now
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
