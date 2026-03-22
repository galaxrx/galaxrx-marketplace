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

/* Content constants — GalaxRX app-specific */
const SHOW_TESTIMONIALS = false; // set to true to show "Real stories, real impact"

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

const FAQ_ITEMS = [
  {
    q: "Who can join GalaxRX?",
    a: "GalaxRX is open to licensed Australian pharmacies only. Every applicant is manually verified by our team — typically within 24 hours — before they can buy or sell.",
  },
  {
    q: "How much does it cost?",
    a: "Nothing to join, nothing monthly. GalaxRX charges a flat 3.5% transaction fee on completed sales only. Buyers pay no fee at all.",
  },
  {
    q: "How fast is listing?",
    a: "Scan a barcode or search by product name. GalaxRX auto-fills product details. Set quantity, expiry, and price — publish in under 20 seconds.",
  },
  {
    q: "Are payments protected?",
    a: "Yes. All payments run through Stripe. Buyer funds are held in escrow and only released to the seller after delivery is confirmed.",
  },
  {
    q: "What if I need something urgently?",
    a: "Use the Wanted board and flag your request as SOS. Verified pharmacies who have the item can make you an offer immediately.",
  },
  {
    q: "What about short-dated stock?",
    a: "List it on the Expiry Clearance board with the expiry date visible. Buyers searching for discounted clearance stock find it there — you recover value before it expires.",
  },
  {
    q: "How long does pharmacy verification take?",
    a: "Typically under 24 hours. Our team manually reviews each application. You'll receive an email confirmation once approved.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col text-white overflow-x-hidden w-full max-w-[100vw]">
      {/* Top: header + compact hero */}
      <div className="relative border-b border-white/[0.06]">
        <HeroWallpaper className="z-0" variant="calm" />
        <LandingHeader />

        <section className="relative z-10 py-8 sm:py-10 md:py-12 lg:py-10 px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="relative w-full max-w-none mx-auto">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.22fr)] gap-6 sm:gap-8 lg:gap-10 xl:gap-12 items-start">
              <div className="min-w-0 flex flex-col items-start text-left w-full max-w-xl sm:max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
                <h1 className="font-heading text-3xl sm:text-4xl md:text-[2.65rem] font-bold text-white leading-[1.15] tracking-tight text-balance mb-3 sm:mb-4 w-full">
                  B2B marketplace for pharmacy surplus and clearance
                </h1>

                <p className="text-white/60 text-base sm:text-[1.05rem] w-full max-w-xl lg:max-w-2xl leading-relaxed mb-5 sm:mb-6">
                  List, browse, and trade with verified Australian pharmacies. Manual verification, Stripe-secured
                  settlement, 3.5% per completed sale — no subscription.
                </p>

                <div className="flex flex-wrap gap-3 justify-start w-full">
                  <Link
                    href="/register"
                    aria-label="Register your pharmacy — free to join"
                    className="inline-flex items-center justify-center bg-gold text-[#0D1B2A] px-6 py-3 rounded-lg font-bold font-heading text-sm hover:bg-gold/90 transition-colors"
                  >
                    Create pharmacy account
                  </Link>
                  <Link
                    href="/listings"
                    aria-label="Browse current pharmacy stock listings"
                    className="inline-flex items-center justify-center border border-white/20 text-white px-6 py-3 rounded-lg font-semibold text-sm hover:bg-white/[0.06] transition-colors"
                  >
                    View listings
                  </Link>
                </div>

                <div
                  className="mt-6 sm:mt-8 w-full max-w-xl lg:max-w-2xl pt-5 sm:pt-6 border-t border-white/[0.08]"
                  role="note"
                  aria-label="Promotional offer for new pharmacies"
                >
                  <div className="relative w-full overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.09] via-[#0c1828]/95 to-[#0a1522] px-4 py-4 sm:px-5 sm:py-5 text-left shadow-[0_16px_40px_-24px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-gold/40 via-gold/60 to-transparent"
                      aria-hidden
                    />
                    <p className="text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.28em] text-gold/95 mb-2">
                      Limited welcome offer
                    </p>
                    <p className="font-heading text-base sm:text-lg md:text-xl font-semibold text-white leading-snug text-balance">
                      Your first 30 days: zero GalaxRX transaction fees
                    </p>
                    <p className="mt-2 text-sm text-white/50 leading-relaxed">
                      New pharmacies pay <span className="text-white/75 font-medium">0% platform fees</span> for 30 days
                      from signup — then our standard <span className="text-white/65">3.5%</span> on completed sales only.
                    </p>
                  </div>
                </div>
              </div>

              <div className="min-w-0 w-full max-w-xl mx-auto lg:max-w-none lg:mx-0">
                <LandingSlideshow className="w-full" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* What we do — description on hover (lg+); always visible on small screens */}
        <ScrollReveal as="section" id="what-we-do" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 xl:px-10 bg-[#0D1B2A] border-t border-white/[0.06]">
          <div className="w-full max-w-none mx-auto">
            <div className="mb-10 max-w-2xl">
              <p className="text-gold/90 text-xs font-semibold tracking-wider uppercase mb-2">What we do</p>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-3">
                One platform for surplus, clearance, and trusted trade
              </h2>
              <p className="text-white/55 text-sm sm:text-base leading-relaxed">
                Verified Australian pharmacies only — list stock fast, buy with confidence, settle through Stripe.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                { title: "List in Seconds", desc: "Scan barcode, set price, publish. No lengthy forms or data entry — list in under 20 seconds.", img: "/LIST.png", alt: "List surplus in seconds" },
                { title: "Verify Stocks", desc: "Search surplus and clearance from verified pharmacies only. No consumers, no grey market.", img: "/Verified%20stock.png", alt: "Buy verified pharmacy stock" },
                { title: "Verify Network", desc: "Every pharmacy is manually verified before they can trade. Deal only with licensed Australian pharmacies.", img: "/Verified%20network.png", alt: "Verified pharmacy network" },
                { title: "Secure Payment", desc: "Stripe-powered payments. You pay only 3.5% when you sell — no subscription, no listing fees.", img: "/Secure%20payment.png", alt: "Secure payments with Stripe" },
              ].map((item) => (
                <div
                  key={item.title}
                  tabIndex={0}
                  className="group rounded-xl overflow-hidden border border-white/[0.08] bg-[#0a1522]/80 hover:border-white/[0.14] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={item.img}
                      alt={item.alt}
                      fill
                      className="object-cover transition-transform duration-300 lg:group-hover:scale-[1.02]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="px-4 py-3 border-t border-white/[0.06]">
                    <h3 className="font-heading font-semibold text-white text-base leading-snug lg:group-hover:text-gold/95 transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-white/50 text-sm leading-relaxed lg:opacity-0 lg:max-h-0 lg:mt-0 lg:overflow-hidden lg:transition-all lg:duration-300 lg:group-hover:opacity-100 lg:group-hover:max-h-[140px] lg:group-hover:mt-2 lg:group-focus-within:opacity-100 lg:group-focus-within:max-h-[140px] lg:group-focus-within:mt-2">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* 10. Testimonials */}
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

        {/* Final CTA */}
        <ScrollReveal as="section" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 xl:px-10 bg-[#0B1220] border-t border-white/[0.06] text-center">
          <div className="w-full max-w-none mx-auto">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to trade with verified pharmacies?
            </h2>
            <p className="text-white/50 text-sm sm:text-base max-w-lg mx-auto mb-8 leading-relaxed">
              Register your business, complete verification, then list or buy on the same platform.
            </p>
            <Link
              href="/register"
              aria-label="Register your pharmacy — free to join"
              className="inline-flex items-center justify-center bg-gold text-[#0D1B2A] px-8 py-3 rounded-lg font-bold font-heading text-sm hover:bg-gold/90 transition-colors"
            >
              Create account
            </Link>
          </div>
        </ScrollReveal>

        {/* FAQ */}
        <ScrollReveal as="section" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 xl:px-10 bg-[#0D1B2A] border-t border-white/[0.06]">
          <div className="w-full max-w-none mx-auto px-0">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white text-center mb-8">FAQ</h2>
            <div className="space-y-2">
              {FAQ_ITEMS.map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-lg border border-white/[0.08] bg-[#0a1522]/50 overflow-hidden"
                >
                  <summary className="flex justify-between items-center gap-4 cursor-pointer list-none px-4 py-3.5 select-none">
                    <span className="font-heading font-medium text-white text-sm sm:text-base leading-snug">
                      {q}
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/50 group-open:rotate-180 transition-transform">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </summary>
                  <div className="border-t border-white/[0.06] px-4 pb-3.5 pt-0">
                    <p className="text-white/55 text-sm leading-relaxed pt-3">{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer */}
        <footer
          id="footer-enquiry"
          className="border-t border-white/[0.08] bg-[#070F18] py-10 sm:py-12 px-4 sm:px-6 lg:px-8 xl:px-10 scroll-mt-24"
        >
          <div className="w-full max-w-none mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 xl:gap-14">
            <div className="lg:col-span-3 max-w-xs">
              <div className="relative h-10 w-28 mb-3">
                <Image src="/logo.png" alt="GalaxRX" fill className="object-contain object-left" sizes="112px" />
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                The trusted marketplace where licensed Australian pharmacies trade surplus stock. List in under 20
                seconds. Pay only 3.5% per sale — no subscription.
              </p>
              <p className="text-white/30 text-xs mt-5">© {new Date().getFullYear()} GalaxRX. All rights reserved.</p>
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
                  Join free
                </Link>
                <Link href="/login" className="block text-white/50 hover:text-white">
                  Sign in
                </Link>
              </div>
              <div>
                <p className="font-semibold text-gold/80 mb-3">About</p>
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
                  Enquiry form
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
