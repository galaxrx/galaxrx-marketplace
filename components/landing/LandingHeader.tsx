"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "/solutions", label: "Solutions" },
  { href: "/why-galaxrx", label: "Why GalaxRX" },
  { href: "/about", label: "About" },
  // Use /#… so “Contact us” works from marketing pages (hash-only is only valid on `/`).
  { href: "/#footer-enquiry", label: "Contact us" },
];

export default function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-20 w-full max-w-none flex justify-between items-center px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-2 sm:py-2.5 border-b border-white/[0.08] bg-[#0D1B2A]/92 backdrop-blur-xl shadow-[0_8px_32px_-20px_rgba(0,0,0,0.45)]">
      <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="relative h-9 w-24 sm:h-10 sm:w-28 md:h-11 md:w-32 lg:h-12 lg:w-36 shrink-0">
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-contain object-left"
            priority
            sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, (max-width: 1024px) 128px, 144px"
          />
        </div>
        <span className="font-heading font-bold text-lg sm:text-xl md:text-2xl tracking-tight text-gold truncate">
          GalaxRX
        </span>
      </Link>

      {/* Desktop nav */}
      <nav aria-label="Main navigation" className="hidden md:flex items-center gap-4 lg:gap-6">
        {NAV_LINKS.map(({ href, label }) =>
          href.startsWith("#") || href.includes("#") ? (
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
          aria-label="Join GalaxRX free"
          className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-bold font-heading shadow-lg shadow-gold-muted/25 hover:shadow-gold/40 hover:scale-105 transition-all duration-200 whitespace-nowrap"
        >
          Join now →
        </Link>
      </nav>

      {/* Mobile: hamburger only (matches landing mock) */}
      <div className="flex md:hidden items-center">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle menu"
          className="p-2 rounded-md border border-gold/45 text-gold hover:bg-white/[0.06] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {portalReady &&
        mobileOpen &&
        createPortal(
          <div
            id="mobile-nav"
            className="md:hidden fixed inset-0 z-[200] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/70 z-0"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <nav
              className="relative z-10 mt-12 sm:mt-14 flex-1 min-h-0 overflow-y-auto bg-[#0F2035] border-t border-[rgba(161,130,65,0.35)] shadow-[0_-8px_32px_rgba(0,0,0,0.45)] flex flex-col pt-4 pb-8 px-4"
              aria-label="Mobile navigation"
            >
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="mb-4 py-3.5 px-4 rounded-xl text-center bg-gold text-[#0D1B2A] font-bold font-heading text-sm"
              >
                Join now
              </Link>
              {NAV_LINKS.map(({ href, label }) =>
                href.startsWith("#") || href.includes("#") ? (
                  <a
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3.5 px-4 rounded-xl text-white hover:text-gold hover:bg-white/10 text-base font-medium border border-transparent"
                  >
                    {label}
                  </a>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3.5 px-4 rounded-xl text-white hover:text-gold hover:bg-white/10 text-base font-medium border border-transparent"
                  >
                    {label}
                  </Link>
                )
              )}
              <Link
                href="/listings"
                onClick={() => setMobileOpen(false)}
                className="py-3.5 px-4 rounded-xl text-white hover:text-gold hover:bg-white/10 text-base font-medium"
              >
                View listings
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="py-3.5 px-4 rounded-xl text-white hover:text-gold hover:bg-white/10 text-base font-medium"
              >
                Sign in
              </Link>
            </nav>
          </div>,
          document.body
        )}
    </header>
  );
}
