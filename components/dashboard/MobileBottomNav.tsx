"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUnreadCount } from "@/components/dashboard/UnreadCountContext";
import { useCart } from "@/components/providers/CartContext";

const primaryTabs = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/buy", label: "Buy", icon: "🛒" },
  { href: "/sell", label: "Sell", icon: "➕" },
  { href: "/cart", label: "Cart", icon: "🧺", showCart: true },
];

const moreItems = [
  { href: "/orders", label: "My Orders", icon: "🛍️" },
  { href: "/messages", label: "Messages", icon: "💬", showUnread: true },
  { href: "/account", label: "My Account", icon: "👤" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
  { href: "/clearance", label: "Clearance Board", icon: "🔴" },
  { href: "/wanted", label: "Wanted Items", icon: "📋" },
  { href: "/wanted-matches", label: "Wanted Matches", icon: "✨" },
  { href: "/wanted/browse", label: "Who Wants My Stock?", icon: "🔍" },
  { href: "/wanted/sos", label: "SOS (Urgent)", icon: "🚨" },
  { href: "/my-listings", label: "My Listings", icon: "📦" },
  { href: "/forum", label: "Community Forum", icon: "💭" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { count: unreadCount } = useUnreadCount();
  const { itemCount: cartCount } = useCart();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isMoreActive = moreItems.some(
    ({ href }) => pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
  );

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="md:hidden fixed inset-0 z-50 bg-black/35"
          />
          <div className="app-mobile-nav md:hidden fixed left-2 right-2 bottom-[5.25rem] z-[60] rounded-xl border border-white/10 bg-mid-navy shadow-xl max-h-[60vh] overflow-y-auto">
            <div className="sticky top-0 bg-mid-navy/95 backdrop-blur px-4 py-3 border-b border-white/10">
              <p className="text-sm font-medium text-gold">More</p>
            </div>
            <div className="p-2">
              {moreItems.map(({ href, label, icon, showUnread }) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      active ? "bg-gold/15 text-gold font-medium" : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-base" aria-hidden>
                      {icon}
                    </span>
                    <span className="truncate pr-10">{label}</span>
                    {showUnread && unreadCount > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                        {unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav className="app-mobile-nav md:hidden fixed bottom-0 left-0 right-0 bg-mid-navy border-t flex items-center justify-around py-2 safe-area-pb z-50">
        {primaryTabs.map(({ href, label, icon, showCart }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md min-w-[4rem] relative ${
                isActive ? "text-gold font-medium" : "text-white/70"
              }`}
            >
              <span className="relative text-xl">
                {icon}
                {showCart && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[1.25rem] h-4 px-1 flex items-center justify-center bg-emerald-600 text-white text-[10px] font-bold rounded-full">
                    {cartCount > 99 ? "99+" : cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </span>
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          aria-expanded={moreOpen}
          aria-label={moreOpen ? "Close more menu" : "Open more menu"}
          className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-md min-w-[4rem] relative ${
            moreOpen || isMoreActive ? "text-gold font-medium" : "text-white/70"
          }`}
        >
          <span className="relative text-xl">
            ☰
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[1.25rem] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span className="text-xs">More</span>
        </button>
      </nav>
    </>
  );
}
