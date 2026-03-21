"use client";

import Link from "next/link";
import { useUnreadCount } from "@/components/dashboard/UnreadCountContext";

type Props = {
  /** Merges with defaults; use for sidebar rows where the parent supplies layout/icon. */
  className?: string;
  hideIcon?: boolean;
};

export default function MessagesLink({ className, hideIcon = false }: Props) {
  const { count } = useUnreadCount();

  return (
    <Link
      href="/messages"
      className={
        className ??
        "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/10 text-white/90 hover:text-white relative"
      }
    >
      {!hideIcon && <span aria-hidden>💬</span>}
      <span className={hideIcon ? "truncate" : undefined}>Messages</span>
      {count > 0 && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
          {count > 99 ? "99+" : count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
