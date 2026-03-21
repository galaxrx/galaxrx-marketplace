"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const viewport = { once: true, amount: 0.1 };

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  },
};

type FeatureIconId = "verified" | "speed" | "escrow" | "economics" | "pricing" | "negotiate";

function FeatureIcon({ id }: { id: FeatureIconId }) {
  const props = {
    className: "w-5 h-5 sm:w-6 sm:h-6",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (id) {
    case "verified":
      return (
        <svg {...props} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "speed":
      return (
        <svg {...props} viewBox="0 0 24 24" aria-hidden>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "escrow":
      return (
        <svg {...props} viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    case "economics":
      return (
        <svg {...props} viewBox="0 0 24 24" aria-hidden>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "pricing":
      return (
        <svg {...props} viewBox="0 0 24 24" aria-hidden>
          <path d="M3 3v18h18" />
          <path d="M7 16l4-4 4 4 6-6" />
          <path d="M21 10V3h-7" />
        </svg>
      );
    case "negotiate":
      return (
        <svg {...props} viewBox="0 0 24 24" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8M8 13h5" />
        </svg>
      );
    default:
      return null;
  }
}

const FEATURES: { title: string; body: string; icon: FeatureIconId }[] = [
  {
    icon: "verified",
    title: "Verified pharmacies only",
    body: "Everyone is manually checked before they trade — licensed Australian pharmacies, not the grey market.",
  },
  {
    icon: "speed",
    title: "List in seconds",
    body: "Scan a barcode, auto-fill product data, publish — without spreadsheets or long forms.",
  },
  {
    icon: "escrow",
    title: "Secure settlement",
    body: "Stripe-powered flow; buyer funds move when delivery is confirmed — clear trail for both sides.",
  },
  {
    icon: "economics",
    title: "Simple fees",
    body: "No subscription. Sellers pay 3.5% on completed sales; buyers pay no platform fee.",
  },
  {
    icon: "pricing",
    title: "Price you can defend",
    body: "Guidance from supplier-market context and live marketplace activity — not guesswork alone.",
  },
  {
    icon: "negotiate",
    title: "One thread for the deal",
    body: "Messages and offers sit on the listing — same product, expiry, and pack for every counter-offer.",
  },
];

export default function WhyGalaxRxMain() {
  return (
    <main className="relative w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-10 sm:py-14 pb-24 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(50vh,480px)] bg-[radial-gradient(ellipse_75%_55%_at_30%_-5%,rgba(201,168,76,0.11),transparent_50%),radial-gradient(ellipse_45%_40%_at_100%_10%,rgba(30,58,95,0.32),transparent_55%)]"
        aria-hidden
      />

      {/* Hero */}
      <div className="relative grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 xl:gap-16 items-center mb-16 sm:mb-20 lg:mb-24">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.5 }}
          className="min-w-0"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-10 bg-gradient-to-r from-gold/80 to-transparent" aria-hidden />
            <p className="text-gold/90 text-xs font-semibold tracking-[0.22em] uppercase">Why GalaxRX</p>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.4rem] font-bold text-white mb-4 leading-[1.1] tracking-tight">
            Clearer pricing.
            <span className="text-white/95"> Negotiation you can trust.</span>
          </h1>
          <p className="text-white/55 text-base sm:text-lg leading-relaxed max-w-xl">
            Surplus, clearance, and wanted stock between <strong className="text-white/80 font-medium">verified</strong>{" "}
            Australian pharmacies — with guidance when you price and one place to close the deal.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.55, delay: 0.06 }}
          className="relative w-full max-w-xl mx-auto lg:max-w-none group"
        >
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-gold/25 via-transparent to-gold/10 opacity-60 blur-sm group-hover:opacity-90 transition-opacity duration-500" aria-hidden />
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0a1522] shadow-[0_28px_64px_-32px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.04]">
            <Image
              src="/expiry.png"
              alt="Pharmacy team managing expiry and clearance stock on GalaxRX"
              fill
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              sizes="(max-width: 1024px) 100vw, 48vw"
              priority
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#0D1B2A]/85 via-transparent to-transparent pointer-events-none"
              aria-hidden
            />
          </div>
        </motion.div>
      </div>

      {/* Feature grid */}
      <section className="relative mb-16 sm:mb-20" aria-labelledby="features-heading">
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.4 }}
        >
          <div>
            <p className="text-gold/85 text-xs font-semibold tracking-[0.2em] uppercase mb-2">Platform</p>
            <h2 id="features-heading" className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
              What you get
            </h2>
          </div>
          <p className="text-white/40 text-sm max-w-sm sm:text-right leading-snug">
            Six things that matter before you confirm a delivery.
          </p>
        </motion.div>

        <motion.ul
          className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {FEATURES.map((f) => (
            <motion.li key={f.title} variants={fadeUp} className="h-full">
              <div className="group relative h-full flex flex-col rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#121f33]/90 to-[#0a1522]/95 p-5 sm:p-6 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.75)] transition-all duration-300 hover:border-gold/28 hover:shadow-[0_24px_56px_-26px_rgba(0,0,0,0.85),0_0_0_1px_rgba(201,168,76,0.07)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-2xl pointer-events-none" aria-hidden />
                <div
                  className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/12 text-gold border border-gold/20 transition-transform duration-300 group-hover:scale-105"
                  aria-hidden
                >
                  <FeatureIcon id={f.icon} />
                </div>
                <h3 className="font-heading font-semibold text-white text-base sm:text-lg mb-2 leading-snug group-hover:text-gold/95 transition-colors">
                  {f.title}
                </h3>
                <p className="text-white/48 text-sm leading-relaxed flex-1">{f.body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </section>

      {/* Two concise insight panels */}
      <div className="grid md:grid-cols-2 gap-5 lg:gap-6 mb-16 sm:mb-20">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-white/[0.08] bg-[#0c1828]/80 p-6 sm:p-7 relative overflow-hidden"
          aria-labelledby="pricing-insight-heading"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/[0.06] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" aria-hidden />
          <h2 id="pricing-insight-heading" className="font-heading text-lg sm:text-xl font-bold text-gold mb-3 relative">
            Price insight
          </h2>
          <p className="text-white/55 text-sm leading-relaxed mb-4 relative">
            Short-dated stock decays fast. GalaxRX surfaces <strong className="text-white/75 font-medium">signals</strong>{" "}
            you can cite — not to replace judgement, but to start from something defensible.
          </p>
          <ul className="text-white/45 text-sm space-y-2 relative">
            <li className="flex gap-2">
              <span className="text-gold/60 shrink-0">✓</span>
              Blend of supplier-market context and what&apos;s moving on-platform.
            </li>
            <li className="flex gap-2">
              <span className="text-gold/60 shrink-0">✓</span>
              Faster path to a number buyers and finance can both live with.
            </li>
          </ul>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="rounded-2xl border border-white/[0.08] bg-[#0c1828]/80 p-6 sm:p-7 relative overflow-hidden"
          aria-labelledby="negotiation-heading"
        >
          <div className="absolute top-0 left-0 w-28 h-28 bg-gold/[0.05] rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" aria-hidden />
          <h2 id="negotiation-heading" className="font-heading text-lg sm:text-xl font-bold text-gold mb-3 relative">
            Negotiation in one place
          </h2>
          <p className="text-white/55 text-sm leading-relaxed mb-4 relative">
            Terms scattered across email and SMS break deals. Here,{" "}
            <strong className="text-white/75 font-medium">offers and chat stay on the listing</strong> — tied to the
            same product, expiry, and counterparty.
          </p>
          <ul className="text-white/45 text-sm space-y-2 relative">
            <li className="flex gap-2">
              <span className="text-gold/60 shrink-0">✓</span>
              Counter-offers with a shared view of what&apos;s changing hands.
            </li>
            <li className="flex gap-2">
              <span className="text-gold/60 shrink-0">✓</span>
              Pairs with verification and settlement so it feels like real B2B trade.
            </li>
          </ul>
        </motion.section>
      </div>

      <motion.div
        className="relative rounded-2xl overflow-hidden border border-gold/20 bg-gradient-to-br from-gold/[0.07] via-[#0c1828] to-[#0a1522] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" aria-hidden />
        <div>
          <p className="font-heading font-semibold text-white text-lg mb-1">See it on live listings</p>
          <p className="text-white/50 text-sm">Register to trade, or browse first.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center bg-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold font-heading text-sm hover:bg-gold/90 transition-colors shadow-md shadow-gold/10"
          >
            Create account
          </Link>
          <Link
            href="/listings"
            className="inline-flex items-center justify-center border border-white/25 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/[0.07] transition-colors"
          >
            View listings
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
