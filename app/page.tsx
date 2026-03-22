import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import ScrollReveal from "@/components/landing/ScrollReveal";
import { PLATFORM, platformTelHref } from "@/lib/platform";
import FooterEnquiryForm from "@/components/landing/FooterEnquiryForm";

const CONTACT_PHONE_RAW = PLATFORM.phone.trim();
const CONTACT_TEL = platformTelHref(CONTACT_PHONE_RAW);

const HeroWallpaper = dynamic(
  () => import("@/components/landing/HeroWallpaper").then((m) => m.default),
  { ssr: true }
);

const LandingSlideshow = dynamic(
  () => import("@/components/landing/LandingSlideshow").then((m) => m.default),
  { ssr: true }
);

const LandingHeader = dynamic(
  () => import("@/components/landing/LandingHeader").then((m) => m.default),
  { ssr: true }
);

const SHOW_TESTIMONIALS = false;

const TESTIMONIALS = [
  {
    quote: "We had short-dated stock that would have been written off. Listed it on GalaxRX and had offers within a day. The clearance board makes it visible to the right buyers.",
    author: "Independent Pharmacist",
    role: "NSW",
  },
  {
    quote: "Listing takes under a minute — scan, set price and expiry, done. No monthly fees. We only pay when we sell. That's how surplus trading should work.",
    author: "Pharmacy Owner",
    role: "Victoria",
  },
  {
    quote: "When we needed a product that was out of stock everywhere, we posted on the Wanted board. Another verified pharmacy had it and made an offer the same day.",
    author: "Chief Pharmacist",
    role: "Queensland",
  },
];

/** Landing FAQ — accurate, AU-focused (no US regulatory claims). */
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

const PILLARS = [
  {
    title: "List inventory",
    desc: "Scan a barcode or search by name, set quantity, price, and expiry, and publish in seconds — without wading through long forms.",
    img: "/LIST.png",
    alt: "List surplus stock quickly",
  },
  {
    title: "Verify stocks",
    desc: "Browse surplus and clearance from verified pharmacies only — no consumers, no anonymous sellers, and key dates visible where it matters.",
    img: "/Verified%20stock.png",
    alt: "Buy from verified pharmacy listings",
  },
  {
    title: "Verify network",
    desc: "Every trading partner is a licensed Australian pharmacy checked by our team. You deal with peers you can trust, not the open internet.",
    img: "/Verified%20network.png",
    alt: "Verified pharmacy network",
  },
  {
    title: "Secure payment",
    desc: "Stripe-powered checkout with funds held until delivery is confirmed — so you get payment certainty alongside simple, per-sale pricing.",
    img: "/Secure%20payment.png",
    alt: "Secure Stripe payments",
  },
];

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
    <div className="min-h-screen flex flex-col text-white overflow-x-hidden w-full max-w-[100vw]">
      <div className="relative border-b border-white/[0.06]">
        <HeroWallpaper className="z-0" variant="calm" />
        <LandingHeader />

        {/* Hero — centered stack + visual below (Stitch-style) */}
        <section className="relative z-10 overflow-hidden px-4 sm:px-6 lg:px-8 xl:px-10 pt-6 pb-10 sm:pt-8 sm:pb-12 md:pb-14">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="landing-hero-orb-primary absolute -top-40 left-[8%] h-[min(28rem,80vw)] w-[min(28rem,80vw)] rounded-full bg-gold/20 blur-[100px]" />
            <div className="landing-hero-orb-secondary absolute top-8 -right-24 h-[min(22rem,70vw)] w-[min(22rem,70vw)] rounded-full bg-[#3d6fb8]/25 blur-[90px]" />
            <div className="absolute bottom-0 left-1/2 h-48 w-[120%] -translate-x-1/2 bg-gradient-to-t from-[#0D1B2A] via-transparent to-transparent opacity-90" />
          </div>
          <div className="relative w-full max-w-3xl mx-auto text-center flex flex-col items-center">
            <p className="mb-4 inline-flex items-center rounded-full border border-gold/25 bg-white/[0.04] px-3.5 py-1.5 text-[0.62rem] sm:text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gold shadow-[0_0_24px_-4px_rgba(201,168,76,0.35)] backdrop-blur-md ring-1 ring-white/[0.06]">
              Verified B2B marketplace
            </p>
            <h1 className="font-heading text-[1.65rem] sm:text-4xl md:text-[2.75rem] font-bold leading-[1.12] tracking-tight text-balance mb-4 sm:mb-5">
              <span className="text-white [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]">Pharmacy surplus and clearance,</span>{" "}
              <span className="bg-gradient-to-r from-gold via-[#e8d5a3] to-gold bg-clip-text italic text-transparent drop-shadow-[0_0_28px_rgba(201,168,76,0.35)]">
                traded with confidence.
              </span>
            </h1>
            <p className="text-white/60 text-[0.95rem] sm:text-base md:text-lg leading-relaxed max-w-xl mb-8 sm:mb-9">
              Licensed Australian pharmacies trade surplus and clearance here — straightforward selling that helps you
              move stock with confidence.
            </p>
            <div className="flex flex-col w-full max-w-md sm:max-w-lg gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                aria-label="Join GalaxRX — free to sign up, then list and trade surplus with verified pharmacies"
                className="inline-flex items-center justify-center bg-gold text-[#0D1B2A] px-6 py-3.5 rounded-xl font-bold font-heading text-xs sm:text-sm uppercase tracking-wide shadow-[0_8px_28px_-6px_rgba(201,168,76,0.55)] transition-all duration-300 hover:bg-gold/92 hover:shadow-[0_12px_36px_-8px_rgba(201,168,76,0.65)] hover:-translate-y-0.5 active:translate-y-0"
              >
                Join now
              </Link>
              <Link
                href="/listings"
                aria-label="Browse current pharmacy stock listings"
                className="inline-flex items-center justify-center rounded-xl border border-gold/40 bg-white/[0.03] px-6 py-3.5 font-semibold font-heading text-xs sm:text-sm uppercase tracking-wide text-gold backdrop-blur-sm transition-all duration-300 hover:border-gold/55 hover:bg-white/[0.08] hover:shadow-[0_0_24px_-8px_rgba(201,168,76,0.2)]"
              >
                View listings
              </Link>
            </div>
          </div>

          <div className="relative mx-auto mt-10 w-full max-w-4xl sm:mt-12">
            <div
              className="pointer-events-none absolute -inset-1 rounded-[1.15rem] bg-gradient-to-br from-gold/25 via-white/[0.08] to-transparent opacity-70 blur-sm"
              aria-hidden
            />
            <LandingSlideshow className="relative w-full" />
          </div>

          <div
            className="mt-8 sm:mt-10 w-full max-w-xl mx-auto pt-6 sm:pt-8 border-t border-white/[0.08]"
            role="note"
            aria-label="Promotional offer for new pharmacies"
          >
            <div className="relative w-full overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.12] via-[#0c1828]/95 to-[#0a1522] px-4 py-4 sm:px-5 sm:py-5 text-left shadow-[0_20px_50px_-24px_rgba(201,168,76,0.2),0_16px_40px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-shadow duration-500 hover:shadow-[0_24px_56px_-20px_rgba(201,168,76,0.25),inset_0_1px_0_0_rgba(255,255,255,0.1)]">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent"
                aria-hidden
              />
              <p className="text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.28em] text-gold/95 mb-2">
                Limited welcome offer
              </p>
              <p className="font-heading text-base sm:text-lg md:text-xl font-semibold text-white leading-snug text-balance">
                Your first 30 days: zero GalaxRX transaction fees
              </p>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">
                New pharmacies pay <span className="text-white/75 font-medium">0% platform fees</span> for 30 days from
                signup — then our standard <span className="text-white/65">3.5%</span> on completed sales only.
              </p>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* Fee spotlight */}
        <ScrollReveal
          as="section"
          className="relative overflow-hidden py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 xl:px-10 bg-[#0a111a] border-t border-white/[0.06]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(201,168,76,0.09),transparent_65%)]" aria-hidden />
          <div
            className="landing-fee-glow pointer-events-none absolute left-1/2 top-1/2 h-[min(32rem,90vw)] w-[min(32rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/15 blur-[100px]"
            aria-hidden
          />
          <div className="relative z-[1] w-full max-w-lg mx-auto text-center">
            <p className="font-heading text-5xl sm:text-6xl font-bold leading-none tracking-tight text-gold [text-shadow:0_0_48px_rgba(201,168,76,0.35)]">
              3.5%
            </p>
            <p className="mt-3 font-heading text-sm sm:text-base font-semibold text-white uppercase tracking-[0.2em]">
              Flat fee on completed sales
            </p>
            <div className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-white/75 text-xs sm:text-sm backdrop-blur-sm">
              <ShieldCheckIcon className="h-5 w-5 shrink-0 text-gold drop-shadow-[0_0_8px_rgba(201,168,76,0.4)]" />
              <span>Payments processed securely with Stripe</span>
            </div>
          </div>
        </ScrollReveal>

        {/* How GalaxRX works */}
        <section
          id="what-we-do"
          className="relative overflow-hidden py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 xl:px-10 bg-[#0D1B2A] border-t border-white/[0.06]"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(201,168,76,0.03)_0%,transparent_35%,transparent_100%)]"
            aria-hidden
          />
          <ScrollReveal as="div" className="relative mb-10 sm:mb-12 text-center">
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-white uppercase tracking-[0.12em] [text-shadow:0_2px_24px_rgba(0,0,0,0.3)]">
              How GalaxRX works
            </h2>
            <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-gold/50 to-transparent" aria-hidden />
          </ScrollReveal>
          <div className="relative mx-auto flex w-full max-w-xl flex-col gap-4 sm:gap-5">
            {PILLARS.map((item, i) => (
              <ScrollReveal key={item.title} as="div" delay={i * 0.09}>
                <div className="group rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111c2e]/95 to-[#0e1623] px-4 py-5 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-gold/20 hover:shadow-[0_24px_48px_-20px_rgba(201,168,76,0.12)] sm:px-5 sm:py-6">
                  <div className="flex gap-4">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/[0.1] bg-[#0a1522] shadow-inner ring-1 ring-white/[0.04] transition-all duration-300 group-hover:ring-gold/25 sm:h-14 sm:w-14">
                      <Image src={item.img} alt={item.alt} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="56px" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="font-heading text-lg font-bold leading-snug text-white transition-colors duration-300 group-hover:text-gold/95 sm:text-xl">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {SHOW_TESTIMONIALS && (
          <ScrollReveal as="section" className="py-14 sm:py-20 md:py-28 px-4 sm:px-6 lg:px-8 xl:px-10 bg-[#0D1B2A] border-t border-[rgba(161,130,65,0.10)]">
            <div className="w-full max-w-none mx-auto">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white text-center mb-16">
                Real stories, real impact
              </h2>
              <div className="grid sm:grid-cols-3 gap-10">
                {TESTIMONIALS.map((t) => (
                  <blockquote key={t.author} className="border-l-4 border-gold pl-7 py-2">
                    <p className="text-white/65 text-base leading-relaxed mb-6 font-light">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <footer>
                      <cite className="not-italic font-semibold text-white text-sm">{t.author}</cite>
                      <span className="text-white/40 text-sm"> — {t.role}</span>
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* FAQ */}
        <ScrollReveal
          as="section"
          className="relative overflow-hidden py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 xl:px-10 bg-[#0a111a] border-t border-white/[0.06]"
        >
          <div
            className="pointer-events-none absolute right-0 top-1/4 h-64 w-64 rounded-full bg-gold/[0.04] blur-[80px]"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-xl">
            <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-10 leading-tight">
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
                  className="group rounded-xl border border-white/[0.08] bg-[#0e1623]/90 overflow-hidden shadow-[0_8px_32px_-20px_rgba(0,0,0,0.4)] transition-[border-color,box-shadow] duration-300 open:border-gold/25 open:shadow-[0_12px_40px_-16px_rgba(201,168,76,0.12)] hover:border-white/[0.14]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 select-none transition-colors duration-200 hover:bg-white/[0.03]">
                    <span className="font-heading text-left text-sm font-semibold leading-snug text-white sm:text-base">
                      {q}
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/15 bg-gold/[0.06] text-gold/90 transition-all duration-300 group-open:rotate-180 group-open:border-gold/30 group-open:bg-gold/10">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </summary>
                  <div className="border-t border-white/[0.06] bg-black/10 px-4 pb-4 pt-0">
                    <p className="pt-3 text-sm leading-relaxed text-white/55">{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Gold CTA band */}
        <ScrollReveal
          as="section"
          className="landing-cta-sheen relative overflow-hidden bg-gradient-to-br from-gold via-[#c9a84c] to-[#b08d3a] px-4 py-12 text-center shadow-[0_-12px_40px_-20px_rgba(201,168,76,0.25)] sm:px-6 sm:py-14 border-t border-white/20"
        >
          <div className="relative z-[1] mx-auto w-full max-w-lg">
            <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-[#1a1408] sm:text-2xl [text-shadow:0_1px_0_rgba(255,255,255,0.2)] mb-3">
              Ready to list or buy?
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-[#2c2415] sm:text-base">
              Join free, get verified, then list or buy surplus and clearance alongside pharmacies like yours — you only pay
              when you sell.
            </p>
            <Link
              href="/register"
              className="inline-flex min-w-[12rem] items-center justify-center rounded-xl bg-[#1e160c] px-8 py-3.5 font-bold font-heading text-xs uppercase tracking-wide text-gold shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-all duration-300 hover:bg-[#2a2114] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 active:translate-y-0 sm:text-sm"
            >
              Join now
            </Link>
          </div>
        </ScrollReveal>

        {/* Footer */}
        <footer
          id="footer-enquiry"
          className="border-t border-white/[0.08] bg-[#070F18] py-10 sm:py-12 px-4 sm:px-6 lg:px-8 xl:px-10 scroll-mt-24"
        >
          <div className="w-full max-w-none mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-14">
            <div className="lg:col-span-3 max-w-xs">
              <p className="font-heading font-bold text-gold text-lg mb-2">GalaxRX</p>
              <div className="relative h-10 w-28 mb-3">
                <Image src="/logo.png" alt="GalaxRX" fill className="object-contain object-left" sizes="112px" />
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                B2B marketplace for licensed Australian pharmacies. List in seconds, browse verified stock, settle through
                Stripe — 3.5% per completed sale, no subscription.
              </p>
              <p className="text-white/30 text-xs mt-5">
                © {new Date().getFullYear()} GalaxRX. All rights reserved.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <span className="text-white/35 text-xs font-semibold uppercase tracking-wider">Connect</span>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={PLATFORM.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/55 hover:border-gold/30 hover:text-gold transition-colors"
                    aria-label="GalaxRX on Instagram"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="18" cy="6" r="1.25" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                  <a
                    href={PLATFORM.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-white/55 hover:border-gold/30 hover:text-gold transition-colors"
                    aria-label="GalaxRX on LinkedIn"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                      <path d="M2 9h4v12H2z" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </a>
                  {CONTACT_TEL ? (
                    <a
                      href={`tel:${CONTACT_TEL}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 h-9 text-sm text-white/55 hover:border-gold/30 hover:text-gold transition-colors"
                      aria-label={`Call ${CONTACT_PHONE_RAW}`}
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 1 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span className="truncate max-w-[11rem]">{CONTACT_PHONE_RAW}</span>
                    </a>
                  ) : (
                    <a
                      href={`mailto:${PLATFORM.email}?subject=${encodeURIComponent("Phone enquiry — GalaxRX")}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 h-9 text-sm text-white/55 hover:border-gold/30 hover:text-gold transition-colors"
                      aria-label="Request phone number by email"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 1 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 1 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      Phone
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 min-w-0">
              <p className="text-gold/90 text-xs font-semibold tracking-wider uppercase mb-2">Enquiry</p>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                For general enquiries and advertising, contact us at{" "}
                <a href={`mailto:${PLATFORM.email}`} className="text-gold hover:text-gold/90 hover:underline">
                  {PLATFORM.email}
                </a>
                , or use the form below — we&apos;ll email you back.
              </p>
              <FooterEnquiryForm contactEmail={PLATFORM.email} />
            </div>

            <div className="lg:col-span-4 flex flex-wrap gap-12 text-sm lg:justify-end">
              <div>
                <p className="font-semibold text-gold/80 mb-3">Why GalaxRX</p>
                <Link href="/why-galaxrx" className="block text-white/50 hover:text-white mb-2">
                  Why GalaxRX
                </Link>
                <Link href="/solutions" className="block text-white/50 hover:text-white mb-2">
                  Solutions
                </Link>
                <Link href="/listings" className="block text-white/50 hover:text-white mb-2">
                  Browse listings
                </Link>
                <Link href="/register" className="block text-white/50 hover:text-white mb-2">
                  Join now
                </Link>
                <Link href="/login" className="block text-white/50 hover:text-white">
                  Sign in
                </Link>
              </div>
              <div>
                <p className="font-semibold text-gold/80 mb-3">Legal &amp; about</p>
                <Link href="/about" className="block text-white/50 hover:text-white mb-2">
                  About GalaxRX
                </Link>
                <Link href="/terms" className="block text-white/50 hover:text-white mb-2">
                  Terms of service
                </Link>
                <Link href="/privacy" className="block text-white/50 hover:text-white mb-2">
                  Privacy policy
                </Link>
                <a href="#footer-enquiry" className="block text-white/50 hover:text-white">
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
