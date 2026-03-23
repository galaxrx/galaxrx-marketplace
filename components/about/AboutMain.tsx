"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import MarketingEyebrow from "@/components/landing/MarketingEyebrow";

const viewport = { once: true, amount: 0.1 };

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const SECTIONS = [
  {
    id: "about-mission",
    title: "Our focus",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" />
      </svg>
    ),
    body: (
      <>
        <p className="mb-3">
          One thing: <strong className="text-white/85 font-medium">wholesale-style trade between verified pharmacies</strong>.
          Listings, Wanted, messages, offers, and checkout follow how dispensary and procurement teams work — not retail
          shoppers.
        </p>
        <p>
          Clearing near-expiry, moving surplus, or posting urgent needs — product, quantity, expiry, and price stay
          visible so both sides can transact with confidence.
        </p>
      </>
    ),
  },
  {
    id: "about-trust",
    title: "Trust & economics",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    body: (
      <>
        <p className="mb-3">
          Every applicant is <strong className="text-white/85 font-medium">manually verified</strong> before they buy
          or sell. Payments run through <strong className="text-white/85 font-medium">Stripe</strong> — buyer funds are
          protected until delivery is confirmed.
        </p>
        <p>
          <strong className="text-white/85 font-medium">No subscription, no listing fee.</strong> Sellers pay{" "}
          <strong className="text-white/85 font-medium">3.5%</strong> on completed sales only; buyers pay no platform
          fee.
        </p>
      </>
    ),
  },
  {
    id: "about-who",
    title: "Who can join",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
      </svg>
    ),
    body: (
      <p>
        <strong className="text-white/85 font-medium">Licensed Australian pharmacies only.</strong> We don&apos;t onboard
        consumers or unverified traders. Register and our team reviews your details before trading is enabled.
      </p>
    ),
  },
] as const;

export default function AboutMain() {
  return (
    <main className="relative w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-10 sm:py-14 pb-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(48vh,460px)] bg-[radial-gradient(ellipse_70%_50%_at_20%_-5%,rgba(201,168,76,0.12),transparent_52%),radial-gradient(ellipse_50%_45%_at_95%_15%,rgba(30,58,95,0.3),transparent_50%)]"
        aria-hidden
      />

      {/* Hero */}
      <div className="relative grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 xl:gap-16 items-start lg:items-center mb-16 sm:mb-20 lg:mb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewport}
          transition={{ duration: 0.5 }}
          className="min-w-0"
        >
          <MarketingEyebrow className="mb-5">About</MarketingEyebrow>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.35rem] font-bold text-white mb-5 leading-[1.1] tracking-tight">
            Built for pharmacy-to-pharmacy trade
          </h1>
          <p className="text-white/55 text-base sm:text-lg leading-relaxed max-w-xl">
            We help licensed Australian pharmacies recover value on surplus and short-dated stock, source hard-to-find
            lines, and deal with peers they can trust — without consumers or grey-market risk in the middle.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewport}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="flex justify-center lg:justify-end group min-w-0 pt-1"
        >
          <div className="relative w-full max-w-xl mx-auto lg:max-w-none min-w-0">
            <div
              className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-gold/20 via-transparent to-gold/10 opacity-50 blur-md group-hover:opacity-80 transition-opacity duration-500"
              aria-hidden
            />
            <div className="relative w-full rounded-2xl border border-white/[0.1] bg-[#0a1522] shadow-[0_28px_64px_-32px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.04]">
              {/* Plain img avoids Next/Image + layout edge cases; dims match public/about.png (3:2). */}
              <img
                src="/about.png"
                alt="GalaxRX — pharmacy marketplace"
                width={1536}
                height={1024}
                decoding="async"
                fetchPriority="high"
                className="w-full h-auto max-w-full block rounded-2xl"
                style={{ width: "100%", height: "auto", verticalAlign: "middle" }}
              />
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-[#0D1B2A]/35 via-[#0D1B2A]/5 to-transparent"
                aria-hidden
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Story cards */}
      <motion.div
        className="relative grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-16 sm:mb-20"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        {SECTIONS.map((s) => (
          <motion.section
            key={s.id}
            id={s.id}
            variants={fadeUp}
            aria-labelledby={`${s.id}-heading`}
            className="group relative flex flex-col rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#121f33]/92 to-[#0a1522]/96 p-6 sm:p-7 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.78)] transition-all duration-300 hover:border-gold/25 hover:shadow-[0_24px_56px_-26px_rgba(0,0,0,0.88),0_0_0_1px_rgba(201,168,76,0.06)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl pointer-events-none" aria-hidden />
            <div
              className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/12 text-gold border border-gold/20 transition-transform duration-300 group-hover:scale-105"
              aria-hidden
            >
              {s.icon}
            </div>
            <h2
              id={`${s.id}-heading`}
              className="font-heading text-lg sm:text-xl font-bold text-gold mb-4 leading-snug group-hover:text-gold transition-colors"
            >
              {s.title}
            </h2>
            <div className="text-white/50 text-sm leading-relaxed flex-1">{s.body}</div>
          </motion.section>
        ))}
      </motion.div>

      <motion.div
        className="relative rounded-2xl overflow-hidden border border-gold/20 bg-gradient-to-br from-gold/[0.07] via-[#0c1828] to-[#0a1522] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" aria-hidden />
        <div>
          <p className="font-heading font-semibold text-white text-lg mb-2">Learn more or get started</p>
          <p className="text-white/50 text-sm flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href="/why-galaxrx" className="text-gold hover:text-gold/90 font-medium">
              Why GalaxRX
            </Link>
            <span className="text-white/25">·</span>
            <Link href="/terms" className="text-white/55 hover:text-white">
              Terms
            </Link>
            <span className="text-white/25">·</span>
            <Link href="/privacy" className="text-white/55 hover:text-white">
              Privacy
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center bg-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold font-heading text-sm hover:bg-gold/90 transition-colors shadow-md shadow-gold/10"
          >
            Join now
          </Link>
          <Link
            href="/listings"
            className="inline-flex items-center justify-center border border-white/25 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/[0.07] transition-colors"
          >
            Browse listings
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
