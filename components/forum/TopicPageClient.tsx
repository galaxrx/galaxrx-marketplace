"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import ForumEmojiBar from "./ForumEmojiBar";

type Author = { id: string; name: string | null; isVerified: boolean | null; state: string | null };
type Reply = {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
};
type Topic = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  replies: Reply[];
};

function insertEmojiAtCursor(
  value: string,
  setValue: (v: string | ((prev: string) => string)) => void,
  emoji: string,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const el = textareaRef?.current;
  if (!el) {
    setValue((prev: string) => prev + emoji);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + emoji + value.slice(end);
  setValue(next);
  setTimeout(() => {
    const pos = start + emoji.length;
    el.setSelectionRange(pos, pos);
    el.focus();
  }, 0);
}

type TopicPageClientProps = { currentUserId: string; topic: Topic };

export default function TopicPageClient({ currentUserId, topic }: TopicPageClientProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>(topic.replies);
  const [deletingTopic, setDeletingTopic] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDeleteTopic = async () => {
    setDeletingTopic(true);
    setError(null);
    try {
      const res = await fetch(`/api/forum/${topic.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to delete");
      }
      router.push("/forum");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete topic");
      setDeletingTopic(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    setDeletingReplyId(replyId);
    setError(null);
    try {
      const res = await fetch(`/api/forum/${topic.id}/replies/${replyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to delete");
      }
      setReplies((prev) => prev.filter((r) => r.id !== replyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete reply");
    } finally {
      setDeletingReplyId(null);
    }
  };

  const handleInsertEmoji = useCallback((emoji: string) => {
    insertEmojiAtCursor(content, setContent, emoji, replyTextareaRef);
  }, [content]);

  const inputClass =
    "w-full px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/forum/${topic.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to post reply");
      setReplies((prev) => [...prev, data]);
      setContent("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-none">
      <Link
        href="/forum"
        className="inline-flex items-center gap-1 text-gold/90 hover:text-gold text-sm"
      >
        ← Back to Community forum
      </Link>
      <p className="text-white/50 text-sm">Public thread — everyone can see and reply. No private chat.</p>

      <article className="p-4 rounded-xl bg-mid-navy border border-[rgba(161,130,65,0.3)] relative">
        <h1 className="text-xl font-heading font-bold text-gold mb-2">{topic.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50 mb-3">
          <span>{topic.author.name ?? "Pharmacy"}</span>
          {topic.author.isVerified && <span className="text-gold">Verified</span>}
          <span>{new Date(topic.createdAt).toLocaleString()}</span>
        </div>
        <div className="text-white/90 whitespace-pre-wrap">{topic.body}</div>
        {topic.author.id === currentUserId && (
          <button
            type="button"
            onClick={handleDeleteTopic}
            disabled={deletingTopic}
            className="absolute top-4 right-4 text-xs text-white/70 hover:text-red-400 disabled:opacity-50"
          >
            {deletingTopic ? "Deleting…" : "Delete topic"}
          </button>
        )}
      </article>

      <section>
        <h2 className="text-lg font-semibold text-gold mb-1">
          Replies ({replies.length})
        </h2>
        <p className="text-white/50 text-sm mb-3">All comments are visible to the community.</p>
        {replies.length === 0 ? (
          <p className="text-white/60 text-sm">No replies yet. Be the first to respond.</p>
        ) : (
          <ul className="space-y-3 mb-6">
            {replies.map((r) => (
              <li
                key={r.id}
                className="p-3 rounded-lg bg-white/5 border border-[rgba(161,130,65,0.2)] relative pr-20"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50 mb-1">
                  <span>{r.author.name ?? "Pharmacy"}</span>
                  {r.author.isVerified && <span className="text-gold">Verified</span>}
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-white/90 whitespace-pre-wrap">{r.content}</p>
                {r.author.id === currentUserId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteReply(r.id)}
                    disabled={deletingReplyId === r.id}
                    className="absolute top-3 right-3 text-xs text-white/70 hover:text-red-400 disabled:opacity-50"
                  >
                    {deletingReplyId === r.id ? "Deleting…" : "Delete"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleReply} className="space-y-2">
          <ForumEmojiBar onInsert={handleInsertEmoji} label="Emoji" />
          <textarea
            ref={replyTextareaRef}
            placeholder="Write a reply…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={2000}
            className={inputClass + " resize-y min-h-[80px]"}
            required
          />
          {error && (
            <p className="text-amber-400 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post reply"}
          </button>
        </form>
      </section>
    </div>
  );
}
