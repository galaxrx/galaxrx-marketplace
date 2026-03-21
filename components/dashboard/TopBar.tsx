"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { useAppTheme } from "@/components/providers/AppThemeProvider";
import { useUnreadCount } from "@/components/dashboard/UnreadCountContext";
import { useCart } from "@/components/providers/CartContext";
import OnlineUserCount from "@/components/dashboard/OnlineUserCount";

type Props = {
  pharmacyName: string;
  pharmacyLogoUrl?: string | null;
};

export default function TopBar({ pharmacyName, pharmacyLogoUrl }: Props) {
  const { count: unreadCount } = useUnreadCount();
  const { itemCount } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { theme, setTheme } = useAppTheme();

  return (
    <header className="app-header sticky top-0 z-40 h-20 border-b flex items-center justify-between gap-4 px-4">
      <div className="flex items-center gap-3">
        <OnlineUserCount />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2 rounded-lg hover:opacity-80 transition opacity-90"
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
        <button
          type="button"
          onClick={async () => {
            await signOut({ callbackUrl: "/login", redirect: false });
            window.location.href = "/login";
          }}
          className="text-sm text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition"
        >
          Sign out
        </button>
        <Link
          href="/cart"
          className="relative p-2 rounded-full hover:bg-white/10 text-white/80"
          aria-label="Shopping cart"
          title="Cart"
        >
          <span className="text-xl">🛒</span>
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center bg-emerald-600 text-white text-xs font-bold rounded-full ring-2 ring-[#0F2035]">
              {itemCount > 99 ? "99+" : itemCount > 9 ? "9+" : itemCount}
            </span>
          )}
        </Link>
        <Link
          href="/messages"
          className="relative p-2 rounded-full hover:bg-white/10 text-white/80"
          aria-label="Messages"
        >
          <span className="text-xl">💬</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full ring-2 ring-[#0F2035]">
              {unreadCount > 99 ? "99+" : unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-white"
          >
            {pharmacyLogoUrl ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/10">
                <Image src={pharmacyLogoUrl} alt="" fill className="object-cover" sizes="32px" />
              </div>
            ) : (
              <span className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold font-medium text-sm">
                {pharmacyName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="text-sm font-medium text-white hidden sm:inline truncate max-w-[120px]">
              {pharmacyName}
            </span>
            <span className="text-white/60">▾</span>
          </button>
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-mid-navy border border-[rgba(161,130,65,0.3)] rounded-xl shadow-xl py-1 z-20">
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-white hover:bg-white/10"
                  onClick={() => setDropdownOpen(false)}
                >
                  Settings
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
