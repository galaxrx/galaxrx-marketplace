"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const NAV_LINKS = [
  { href: "#what-we-do", label: "What we do" },
  { href: "/solutions", label: "Solutions" },
  { href: "/why-galaxrx", label: "Why GalaxRX" },
  { href: "/about", label: "About" },
  { href: "#footer-enquiry", label: "Contact us" },
];

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 w-full max-w-none flex justify-between items-center px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-3 sm:py-4 border-b border-[rgba(161,130,65,0.15)] bg-[#0D1B2A]/90 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2 sm:gap-3 min-h-[3rem] min-w-0">
        <div className="relative h-10 w-28 sm:h-14 sm:w-36 md:h-16 md:w-48 shrink-0">
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-contain object-left"
            priority
            sizes="(max-width: 640px) 112px, (max-width: 768px) 144px, 192px"
          />
        </div>
        <span className="font-heading font-bold text-lg sm:text-xl md:text-2xl tracking-tight truncate">
          <span className="text-white">Galax</span>
          <span className="text-gold">RX</span>
          <span className="text-white hidden sm:inline"> Market Place</span>
        </span>
      </Link>

      {/* Desktop nav */}
      <nav aria-label="Main navigation" className="hidden md:flex items-center gap-4 lg:gap-6">
        {NAV_LINKS.map(({ href, label }) =>
          href.startsWith("#") ? (
            <a key={href} href={href} className="text-white/70 hover:text-gold text-sm font-medium transition-colors">
              {label}
            </a>
          ) : (
            <Link key={href} href={href} className="text-white/70 hover:text-gold text-sm font-medium transition-colors">
              {label}
            </Link>
          )
        )}
        <Link
          href="/listings"
          className="text-white/70 hover:text-white text-sm font-medium transition-colors hidden lg:block"
        >
          Browse listings
        </Link>
        <Link
          href="/login"
          className="text-white/70 hover:text-white text-sm font-medium transition-colors hidden lg:block"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          aria-label="Register your pharmacy for free"
          className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-bold font-heading shadow-lg shadow-gold-muted/25 hover:shadow-gold/40 hover:scale-105 transition-all duration-200 whitespace-nowrap"
        >
          Join free →
        </Link>
      </nav>

      {/* Mobile: hamburger + CTA */}
      <div className="flex md:hidden items-center gap-2">
        <Link
          href="/register"
          aria-label="Register your pharmacy for free"
          className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-3 py-2 rounded-xl text-xs font-bold font-heading shrink-0"
        >
          Join free →
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle menu"
          className="p-2 rounded-lg text-white/80 hover:text-gold hover:bg-white/5 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {/* Mobile nav overlay */}
      <div
        id="mobile-nav"
        className={`fixed inset-0 top-[3.5rem] z-10 md:hidden bg-[#0D1B2A]/98 backdrop-blur-md transition-opacity duration-200 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <nav className="flex flex-col pt-6 px-6 gap-1" aria-label="Mobile navigation">
          {NAV_LINKS.map(({ href, label }) =>
            href.startsWith("#") ? (
              <a
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="py-3 px-4 rounded-xl text-white/80 hover:text-gold hover:bg-white/5 text-base font-medium"
              >
                {label}
              </a>
            ) : (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="py-3 px-4 rounded-xl text-white/80 hover:text-gold hover:bg-white/5 text-base font-medium"
              >
                {label}
              </Link>
            )
          )}
          <Link
            href="/listings"
            onClick={() => setMobileOpen(false)}
            className="py-3 px-4 rounded-xl text-white/80 hover:text-gold hover:bg-white/5 text-base font-medium"
          >
            Browse listings
          </Link>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="py-3 px-4 rounded-xl text-white/80 hover:text-gold hover:bg-white/5 text-base font-medium"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
