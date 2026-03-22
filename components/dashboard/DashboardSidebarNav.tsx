"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MessagesLink from "./MessagesLink";

const STORAGE_KEY = "galaxrx-sidebar-more-open";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const primaryLinks: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/buy", label: "Buy Stock", icon: "🛒" },
  { href: "/sell", label: "Sell Stock", icon: "➕" },
];

const secondaryGroups: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Account",
    items: [
      { href: "/account", label: "My Account", icon: "👤" },
      { href: "/settings", label: "Settings", icon: "⚙️" },
    ],
  },
  {
    heading: "Marketplace",
    items: [
      { href: "/clearance", label: "Clearance Board", icon: "🔴" },
      { href: "/wanted", label: "Wanted Items", icon: "📋" },
      { href: "/wanted-matches", label: "Wanted matches", icon: "✨" },
      { href: "/wanted/browse", label: "Who wants my stock?", icon: "🔍" },
      { href: "/wanted/sos", label: "SOS (urgent)", icon: "🚨" },
      { href: "/my-listings", label: "My Listings", icon: "📦" },
    ],
  },
  {
    heading: "Orders & messages",
    items: [
      { href: "/cart", label: "Cart", icon: "🧺" },
      { href: "/orders", label: "My Orders", icon: "🛍️" },
      { href: "/messages", label: "Messages", icon: "💬" },
    ],
  },
  {
    heading: "Community",
    items: [{ href: "/forum", label: "Community forum", icon: "💭" }],
  },
];

function isRouteActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

function isPrimaryAppRoute(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  if (pathname === "/buy" || pathname.startsWith("/buy/")) return true;
  if (pathname === "/sell" || pathname.startsWith("/sell/")) return true;
  return false;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function NavButton({
  href,
  label,
  icon,
  active,
  variant,
}: NavItem & { active: boolean; variant: "primary" | "secondary" }) {
  const base =
    "flex items-center gap-3 rounded-lg transition-colors text-left w-full min-w-0";
  const primaryCls = active
    ? "bg-gold/15 text-gold font-medium shadow-[inset_3px_0_0_0] shadow-gold"
    : "text-white/90 hover:bg-white/10 hover:text-white";
  const secondaryCls = active
    ? "bg-white/10 text-white font-medium"
    : "text-white/75 hover:bg-white/5 hover:text-white/95";

  const cls = `${base} ${variant === "primary" ? `px-3 py-2.5 ${primaryCls}` : `px-2.5 py-2 text-sm ${secondaryCls}`}`;

  const iconWrap =
    variant === "primary"
      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/5 text-lg leading-none"
      : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-base leading-none";

  return (
    <Link href={href} className={cls}>
      <span className={iconWrap} aria-hidden>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function MessagesNavRow({ pathname }: { pathname: string }) {
  const active = isRouteActive(pathname, "/messages");
  const row = active
    ? "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm w-full min-w-0 bg-white/10 text-white font-medium"
    : "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm w-full min-w-0 text-white/75 hover:bg-white/5 hover:text-white/95";

  return (
    <div className={row}>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-base leading-none"
        aria-hidden
      >
        💬
      </span>
      <MessagesLink
        hideIcon
        className={`relative flex min-w-0 flex-1 items-center rounded-md py-0 pl-0 pr-10 text-sm ${
          active ? "text-white font-medium" : "text-inherit"
        } hover:bg-transparent hover:text-inherit`}
      />
    </div>
  );
}

type Props = { userName: string; isAdmin: boolean };

export default function DashboardSidebarNav({ userName, isAdmin }: Props) {
  const pathname = usePathname() ?? "";
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setMoreOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  const secondaryVisible = !isPrimaryAppRoute(pathname) || moreOpen;

  const toggleMore = useCallback(() => {
    setMoreOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <nav className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Main
        </p>
        <div className="space-y-1">
          {primaryLinks.map((item) => (
            <NavButton
              key={item.href}
              {...item}
              active={isRouteActive(pathname, item.href)}
              variant="primary"
            />
          ))}
        </div>

        {isPrimaryAppRoute(pathname) && (
          <button
            type="button"
            onClick={toggleMore}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-sm font-medium text-white/90 transition hover:border-white/15 hover:bg-white/[0.07] hover:text-white"
            aria-expanded={moreOpen}
            aria-label={moreOpen ? "Hide additional menu items" : "Show additional menu items"}
          >
            <span>More</span>
            <Chevron open={moreOpen} />
          </button>
        )}

        {secondaryVisible && (
          <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
            {isPrimaryAppRoute(pathname) && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                All tools
              </p>
            )}
            {secondaryGroups.map((group) => (
              <div key={group.heading}>
                <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-wider text-white/35">
                  {group.heading}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) =>
                    item.href === "/messages" ? (
                      <MessagesNavRow key={item.href} pathname={pathname} />
                    ) : (
                      <NavButton
                        key={item.href}
                        {...item}
                        active={isRouteActive(pathname, item.href)}
                        variant="secondary"
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {isAdmin && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-gold/15 text-gold font-medium shadow-[inset_3px_0_0_0] shadow-gold/80 hover:bg-gold/25"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gold/20 text-lg">
                🛡️
              </span>
              <span>Admin</span>
            </Link>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 p-3">
        <span className="block truncate px-3 py-2 text-sm text-white/60">{userName}</span>
      </div>
    </nav>
  );
}
