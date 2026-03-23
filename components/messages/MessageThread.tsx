"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { format } from "date-fns";

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
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [threadId, currentUserId]);

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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0D1B2A]">
        <div className="animate-pulse text-white/60">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#0D1B2A]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0D1B2A]">
        {messages.length === 0 ? (
          <p className="text-white/70 text-sm">No messages in this thread.</p>
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
                    isMe ? "bg-gold text-[#0D1B2A]" : "bg-white/10 text-white border border-[rgba(161,130,65,0.2)]"
                  }`}
                >
                  {!isMe && (
                    <p className="text-xs text-white/80 mb-0.5">
                      {m.sender.name}
                      {m.sender.isVerified && " ✓"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMe ? "text-[#0D1B2A]/70" : "text-white/60"
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
          className="p-4 border-t border-[rgba(161,130,65,0.2)] bg-[#0F2035] flex flex-wrap gap-2"
        >
          {sendError && (
            <p className="w-full text-xs text-red-300 -mt-1 mb-1">
              {sendError}
            </p>
          )}
          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (sendError) setSendError(null);
            }}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2 rounded-lg font-bold disabled:opacity-50 hover:opacity-90"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
