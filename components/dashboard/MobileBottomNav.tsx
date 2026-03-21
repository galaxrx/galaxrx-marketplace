"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadCount } from "@/components/dashboard/UnreadCountContext";
import { useCart } from "@/components/providers/CartContext";

const tabs = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/buy", label: "Buy", icon: "🛒" },
  { href: "/cart", label: "Cart", icon: "🧺", showCart: true },
  { href: "/sell", label: "Sell", icon: "➕" },
  { href: "/orders", label: "Orders", icon: "🛍️" },
  { href: "/messages", label: "Messages", icon: "💬", showUnread: true },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { count: unreadCount } = useUnreadCount();
  const { itemCount: cartCount } = useCart();

  return (
    <nav className="app-mobile-nav md:hidden fixed bottom-0 left-0 right-0 bg-mid-navy border-t flex items-center justify-around py-2 safe-area-pb z-50">
      {tabs.map(({ href, label, icon, showUnread, showCart }) => {
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
              {showUnread && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[1.25rem] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
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
    </nav>
  );
}
