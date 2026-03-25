"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useUnreadCount } from "@/components/dashboard/UnreadCountContext";
import { useAppTheme } from "@/components/providers/AppThemeProvider";

type Message = {
  id: string;
  content: string;
  senderId: string;
  recipientId?: string;
  createdAt: string;
  sender: { id: string; name: string; isVerified: boolean };
};

export default function MessageThread({
  threadId,
  currentUserId,
}: {
  threadId: string;
  currentUserId: string;
}) {
  const { refresh } = useUnreadCount();
  const { theme } = useAppTheme();
  const isLight = theme === "light";
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(() => {
    fetch(`/api/messages/${encodeURIComponent(threadId)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { messages: [], recipientId: null }))
      .then((data: { messages: Message[]; recipientId: string | null }) => {
        const msgs = Array.isArray(data) ? data : data.messages ?? [];
        setMessages(msgs);
        if (data.recipientId) {
          setRecipientId(data.recipientId);
        } else if (msgs.length > 0) {
          const other = msgs.find((m) => m.senderId !== currentUserId);
          if (other) setRecipientId(other.senderId);
        }
        // Opening/refetching a thread marks its incoming messages as read on the server.
        // Refresh global unread badge immediately instead of waiting for poll interval.
        refresh();
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [threadId, currentUserId, refresh]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || !recipientId) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(threadId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, recipientId }),
      });
      if (res.ok) {
        setContent("");
        fetchMessages();
      } else {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setSendError(data?.message ?? "Unable to send this message right now.");
      }
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && content.trim()) {
        void handleSubmit(e as unknown as React.FormEvent);
      }
    }
  }

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center p-8 ${isLight ? "bg-white" : "bg-[#0D1B2A]"}`}>
        <div className={`animate-pulse ${isLight ? "text-gray-500" : "text-white/60"}`}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={`grid grid-rows-[auto_1fr_auto] flex-1 min-h-0 h-full ${isLight ? "bg-white" : "bg-[#0D1B2A]"}`}>
      <div className={`md:hidden px-4 py-2 border-b ${isLight ? "border-gray-200 bg-white" : "border-[rgba(161,130,65,0.2)] bg-[#0F2035]"}`}>
        <Link href="/messages" className="text-sm text-gold hover:underline">
          ← Back to inbox
        </Link>
      </div>
      <div
        className={`min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 pb-28 md:pb-4 space-y-3 ${isLight ? "bg-white" : "bg-[#0D1B2A]"}`}
        style={{ scrollbarGutter: "stable", WebkitOverflowScrolling: "touch" }}
      >
        {messages.length === 0 ? (
          <p className={`text-sm ${isLight ? "text-gray-500" : "text-white/70"}`}>No messages in this thread.</p>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    isMe
                      ? "bg-gold text-[#0D1B2A]"
                      : isLight
                        ? "bg-gray-50 text-gray-900 border border-gray-200"
                        : "bg-white/10 text-white border border-[rgba(161,130,65,0.2)]"
                  }`}
                >
                  {!isMe && (
                    <p className={`text-xs mb-0.5 ${isLight ? "text-gray-600" : "text-white/80"}`}>
                      {m.sender.name}
                      {m.sender.isVerified && " ✓"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMe ? "text-[#0D1B2A]/70" : isLight ? "text-gray-500" : "text-white/60"
                    }`}
                  >
                    {format(new Date(m.createdAt), "dd MMM, HH:mm")}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {recipientId && (
        <form
          onSubmit={handleSubmit}
          className={`sticky bottom-0 z-20 p-3 md:p-4 border-t backdrop-blur space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
            isLight
              ? "border-gray-200 bg-white/95 supports-[backdrop-filter]:bg-white/85"
              : "border-[rgba(161,130,65,0.2)] bg-[#0F2035]/95 supports-[backdrop-filter]:bg-[#0F2035]/85"
          }`}
        >
          {sendError && (
            <p className="text-xs text-red-300">
              {sendError}
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (sendError) setSendError(null);
              }}
              onKeyDown={handleComposerKeyDown}
              placeholder="Type a message…"
              className={`flex-1 px-3 py-2 min-h-[44px] max-h-28 resize-none rounded-lg leading-5 focus:ring-2 focus:ring-gold ${
                isLight
                  ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
                  : "bg-white/5 border border-[rgba(161,130,65,0.25)] text-white placeholder-white/40"
              }`}
              maxLength={2000}
              rows={1}
            />
            <button
              type="submit"
              disabled={sending || !content.trim()}
              className="h-[44px] bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 rounded-lg font-bold disabled:opacity-50 hover:opacity-90"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          <p className={`text-[11px] ${isLight ? "text-gray-500" : "text-white/45"}`}>
            Press Enter to send, Shift+Enter for a new line.
          </p>
        </form>
      )}
    </div>
  );
}
