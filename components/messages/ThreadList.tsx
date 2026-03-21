"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

type Thread = {
  threadId: string;
  other: { id: string; name: string; isVerified: boolean };
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export default function ThreadList() {
  const pathname = usePathname();
  const currentThreadId = pathname?.startsWith("/messages/")
    ? pathname.replace("/messages/", "")
    : null;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages/threads", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setThreads)
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
    // Fetch once on mount; pathname changes (e.g. opening a thread) don't need a full refetch
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-2">
        <div className="h-12 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-12 bg-white/10 rounded-lg animate-pulse" />
        <div className="h-12 bg-white/10 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-4 text-white/70 text-sm">
        No messages yet. Message a seller from a listing or reply to a wanted request.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[rgba(161,130,65,0.15)]">
      {threads.map((t) => (
        <li key={t.threadId}>
          <Link
            href={`/messages/${t.threadId}`}
            className={`block p-4 hover:bg-white/5 ${
              currentThreadId === t.threadId ? "bg-gold/10 border-l-2 border-l-gold" : ""
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <span className="font-medium text-sm text-white truncate">
                {t.other.name}
                {t.other.isVerified && " ✓"}
              </span>
              {t.unread > 0 && (
                <span className="bg-gold text-[#0D1B2A] text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 font-bold">
                  {t.unread}
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 truncate mt-0.5">
              {t.lastMessage}
            </p>
            <p className="text-xs text-white/50 mt-1">
              {formatDistanceToNow(new Date(t.lastAt), { addSuffix: true })}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
