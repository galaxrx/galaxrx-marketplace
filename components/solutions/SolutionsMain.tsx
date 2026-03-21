"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { USE_CASES, PLATFORM_FEATURES } from "@/lib/solutions-data";

const viewport = { once: true, amount: 0.08 };

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export default function SolutionsMain() {
  return (
    <main className="relative w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-10 sm:py-14 pb-24 overflow-hidden">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(55vh,520px)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(201,168,76,0.12),transparent_55%),radial-gradient(ellipse_50%_40%_at_100%_0%,rgba(30,58,95,0.35),transparent_50%)]"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative mb-14 sm:mb-16 max-w-5xl"
      >
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px w-10 bg-gradient-to-r from-gold/80 to-transparent" aria-hidden />
          <p className="text-gold/90 text-xs font-semibold tracking-[0.2em] uppercase">Solutions</p>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.35rem] font-bold text-white mb-3 leading-[1.12] tracking-tight">
          How pharmacies move stock on GalaxRX
        </h1>
        <p className="text-white/45 text-sm sm:text-base max-w-2xl mb-10 leading-relaxed">
          Same verified network and secure payments — whether you&apos;re listing or buying. Below is the flow at a glance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6" role="presentation">
          {/* Sellers */}
          <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#101f33]/95 to-[#0a1522]/95 p-6 sm:p-7 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.75)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-gold/40 via-gold/20 to-transparent" aria-hidden />
            <p className="text-gold/90 text-[0.65rem] font-bold tracking-[0.22em] uppercase mb-3">For sellers</p>
            <h2 className="font-heading text-xl sm:text-2xl font-semibold text-white mb-5 leading-snug">
              List from the counter or your POS export
            </h2>
            <ol className="mb-6 rounded-xl border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden bg-black/10">
              {[
                { n: "1", t: "Capture stock", d: "Enter lines manually, or upload the Excel file you export from your POS." },
                { n: "2", t: "Review & publish", d: "Confirm details once — your listing goes live to verified pharmacies only." },
                { n: "3", t: "Trade & settle", d: "Offers and messages stay in one place until you complete the sale on-platform." },
              ].map((step) => (
                <li key={step.n} className="flex gap-4 px-4 py-4 sm:px-5 sm:py-5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-gold font-heading font-bold text-sm border border-gold/25"
                    aria-hidden
                  >
                    {step.n}
                  </span>
                  <div>
                    <p className="font-heading font-semibold text-white text-sm sm:text-base mb-1">{step.t}</p>
                    <p className="text-white/50 text-sm leading-relaxed">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-white/35 text-xs leading-relaxed border-t border-white/[0.06] pt-4">
              Detail pages below walk through surplus, clearance, and the Wanted board step by step.
            </p>
          </div>

          {/* Buyers */}
          <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#101f33]/95 to-[#0a1522]/95 p-6 sm:p-7 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.75)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-gold/40" aria-hidden />
            <p className="text-gold/90 text-[0.65rem] font-bold tracking-[0.22em] uppercase mb-3">For buyers</p>
            <h2 className="font-heading text-xl sm:text-2xl font-semibold text-white mb-5 leading-snug">
              Price with confidence, then close the deal
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 text-sm font-heading font-semibold text-white/90">
              <span className="rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2">Price insight</span>
              <span className="text-gold/60" aria-hidden>
                →
              </span>
              <span className="rounded-lg bg-white/[0.06] border border-white/[0.1] px-3 py-2">Offer</span>
              <span className="text-gold/60" aria-hidden>
                →
              </span>
              <span className="rounded-lg bg-gold/15 border border-gold/30 px-3 py-2 text-gold">Buy</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              Use marketplace and supplier-aware <strong className="text-white/70 font-medium">pricing guidance</strong> to
              anchor your offer, negotiate in-app with a clear trail, and checkout when both sides are ready — with
              payments handled securely.
            </p>
            <ul className="text-white/40 text-xs sm:text-sm space-y-2">
              <li className="flex gap-2">
                <span className="text-gold/70 shrink-0">·</span>
                Compare context before you bid — fewer back-and-forths on price.
              </li>
              <li className="flex gap-2">
                <span className="text-gold/70 shrink-0">·</span>
                Same thread for messages and offers, then one path to pay.
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Use cases */}
      <section className="relative mb-20 sm:mb-24" aria-labelledby="use-cases-heading">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 sm:mb-12">
          <div className="max-w-2xl">
            <h2
              id="use-cases-heading"
              className="font-heading text-2xl sm:text-3xl md:text-[2rem] font-bold text-white mb-3 tracking-tight"
            >
              What GalaxRX provides for your pharmacy
            </h2>
            <p className="text-white/45 text-sm sm:text-base leading-relaxed">
              Three common ways pharmacies use the marketplace — one verification and settlement model behind each.
            </p>
          </div>
          <Link
            href="/listings"
            className="group inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-gold/90 shrink-0 self-start lg:self-auto transition-colors"
          >
            Browse all listings
            <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          </Link>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-7"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {USE_CASES.map((item, i) => (
            <motion.article
              key={item.title}
              variants={fadeUp}
              className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-b from-[#101f33]/90 to-[#0a1522]/95 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.85)] transition-[border-color,box-shadow] duration-500 hover:border-gold/25 hover:shadow-[0_28px_56px_-24px_rgba(0,0,0,0.9),0_0_0_1px_rgba(201,168,76,0.08)]"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden />
              <div className="relative aspect-[4/3] overflow-hidden bg-[#070f18]">
                <Image
                  src={item.img}
                  alt={item.alt}
                  fill
                  className="object-cover transition-[transform,filter] duration-700 ease-out group-hover:scale-[1.06] group-hover:brightness-[1.05]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  priority={i === 0}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#0a1522] via-[#0a1522]/20 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-75"
                  aria-hidden
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-white/0 via-white/[0.08] to-white/0"
                  aria-hidden
                />
              </div>
              <div className="relative flex-1 flex flex-col p-6 sm:p-7">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold/70 mb-2">
                  Use case {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-heading font-semibold text-white text-lg sm:text-xl mb-3 leading-snug group-hover:text-gold/95 transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed mb-6 flex-1">{item.desc}</p>
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/[0.06] mt-auto">
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-2 bg-gold text-[#0D1B2A] px-4 py-2.5 rounded-xl font-bold font-heading text-sm hover:bg-gold/90 transition-all shadow-md shadow-gold/10 hover:shadow-lg hover:shadow-gold/15"
                  >
                    {item.cta}
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href={item.learnMore}
                    className="text-white/45 hover:text-gold text-sm font-medium transition-colors"
                  >
                    Learn more
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* Platform features */}
      <section
        className="relative border-t border-white/[0.08] pt-16 sm:pt-20"
        aria-labelledby="platform-features-heading"
      >
        <div className="absolute left-1/2 top-0 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden />

        <motion.div
          className="mb-12 sm:mb-14 max-w-3xl"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.45 }}
        >
          <p className="text-gold/90 text-xs font-semibold tracking-[0.2em] uppercase mb-3">Platform</p>
          <h2
            id="platform-features-heading"
            className="font-heading text-2xl sm:text-3xl md:text-[2rem] font-bold text-white mb-4 tracking-tight"
          >
            Built for dispensary and procurement workflows
          </h2>
          <p className="text-white/45 text-sm sm:text-base leading-relaxed">
            Liquidity, fast listing, in-app offers, and pricing support — in one regulated-industry-ready stack.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {PLATFORM_FEATURES.map((feature, i) => (
            <motion.article
              key={feature.title}
              variants={fadeUp}
              className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/[0.07] bg-[#0c1828]/80 backdrop-blur-sm transition-all duration-500 hover:border-white/[0.14] hover:bg-[#0e1c2e]/90 hover:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.75)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#070f18]">
                <Image
                  src={feature.img}
                  alt={feature.alt}
                  fill
                  className="object-cover transition-transform group-hover:scale-[1.08]"
                  style={{
                    transitionDuration: "650ms",
                    transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                />
                <div
                  className="absolute inset-0 ring-1 ring-inset ring-white/[0.06] pointer-events-none group-hover:ring-gold/15 transition-[box-shadow] duration-500"
                  aria-hidden
                />
                <div
                  className="absolute inset-0 bg-gradient-to-br from-gold/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden
                />
              </div>
              <div className="flex-1 p-5 sm:p-6 border-t border-white/[0.06] bg-gradient-to-b from-transparent to-black/[0.15]">
                <h3 className="font-heading font-semibold text-white text-[0.95rem] sm:text-base leading-snug mb-3 group-hover:text-gold/90 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-white/48 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <motion.div
        className="relative mt-16 sm:mt-20 rounded-2xl overflow-hidden border border-gold/20 bg-gradient-to-br from-gold/[0.08] via-[#0c1828] to-[#0a1522] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.85)]"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewport}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/45 to-transparent" aria-hidden />
        <div>
          <p className="font-heading font-semibold text-white text-lg mb-1">Ready to join?</p>
          <p className="text-white/50 text-sm">Register your pharmacy or open live listings.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center bg-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold font-heading text-sm hover:bg-gold/90 transition-colors shadow-lg shadow-gold/10"
          >
            Create account
          </Link>
          <Link
            href="/listings"
            className="inline-flex items-center justify-center border border-white/25 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/[0.08] transition-colors"
          >
            View listings
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
