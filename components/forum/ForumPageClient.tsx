"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import ForumEmojiBar from "./ForumEmojiBar";

type SuggestedTopic = { title: string; body: string; icon: string; badge?: string };
type ForumSection = { id: string; title: string; description: string; topics: SuggestedTopic[] };

const FORUM_SECTIONS: ForumSection[] = [
  {
    id: "profit-margins",
    title: "Profit & Margins",
    description: "Pricing, margins, reimbursement issues.",
    topics: [
      { title: "Actual profit margins on prescriptions", body: "Share experiences on current dispensing margins and how reimbursement changes have affected your bottom line.", icon: "📊", badge: "Hot" },
      { title: "Negotiating with wholesalers", body: "What tactics have worked for you? Rebates, volume tiers, payment terms.", icon: "🤝" },
      { title: "Product categories with the highest margins", body: "Which categories deliver the best margin in your store? OTC, front of shop, clinical?", icon: "📈" },
      { title: "Private label opportunities", body: "Have you moved into private label? Pros, cons and supplier experiences.", icon: "🏷️" },
    ],
  },
  {
    id: "inventory-supply",
    title: "Inventory & Supply Chain",
    description: "Purchasing, expiry, surplus stock.",
    topics: [
      { title: "How much capital is trapped in dead stock?", body: "Discuss how much of your inventory is slow-moving or at risk of expiry. What % of capital is tied up?", icon: "💰", badge: "Hot" },
      { title: "Methods to identify slow-moving SKUs early", body: "Systems, reports and routines to spot slow movers before they become dead stock.", icon: "🔍" },
      { title: "Strategies to redistribute surplus inventory", body: "Selling to other pharmacies, clearance, returns, platforms like GalaxRX. What works?", icon: "📦" },
      { title: "Expiry management practices", body: "How do you minimise wastage? FEFO, alerts, discounting near expiry.", icon: "📅" },
      { title: "Buying groups vs direct purchasing", body: "Experiences with buying groups vs dealing directly with wholesalers. Cost and flexibility.", icon: "🛒" },
      { title: "Comparing wholesaler contracts", body: "What to look for in contracts. Payment terms, minimum orders, delivery frequency.", icon: "📋" },
      { title: "Managing supplier payment terms", body: "How you align payment terms with cash flow. Stretching payables without damaging relationships.", icon: "💳" },
      { title: "Inventory turnover optimization", body: "Target turnover rates, fast vs slow lines, and practical ways to improve.", icon: "🔄" },
      { title: "Best performing retail categories", body: "Which OTC and retail categories drive profit in your pharmacy? Data and experience.", icon: "⭐" },
      { title: "Removing unproductive SKUs", body: "When and how to delist. Data-driven assortment decisions.", icon: "✂️" },
    ],
  },
  {
    id: "growth-marketing",
    title: "Growth & Marketing",
    description: "Customer acquisition, differentiation.",
    topics: [
      { title: "How independents differentiate from chains", body: "What do you do that chains can't? Service, community, niche, convenience.", icon: "🎯", badge: "Trending" },
      { title: "Customer retention strategies", body: "Loyalty, personalisation, repeat scripts, relationships. What keeps customers coming back?", icon: "❤️" },
      { title: "Community engagement tactics", body: "Local events, health campaigns, schools, GPs. What has worked for your pharmacy?", icon: "🏘️" },
      { title: "Pricing when you cannot match chains", body: "How to compete on value and service when you can't match big-box pricing.", icon: "💵" },
      { title: "Click-and-collect models", body: "Experiences with online order and in-store pickup. Systems, demand, staffing.", icon: "📱" },
      { title: "Local delivery services", body: "Offering delivery: cost, demand, logistics and whether it pays off.", icon: "🚗" },
      { title: "Digital marketing for independents", body: "Social media, Google, email. What channels work for pharmacy?", icon: "📲" },
      { title: "Should independents sell online?", body: "Pros and cons of e-commerce for independent pharmacies. Where to start.", icon: "🌐" },
    ],
  },
  {
    id: "operations-staffing",
    title: "Operations & Staffing",
    description: "Workflow, hiring, productivity.",
    topics: [
      { title: "Optimal staffing levels", body: "How many staff and what mix (pharmacist, tech, retail) for your script volume and opening hours?", icon: "👥", badge: "Important" },
      { title: "Automation in dispensing", body: "Robotics, packers, workflow tech. What has reduced workload or errors in your pharmacy?", icon: "🤖" },
      { title: "Reducing pharmacist workload", body: "Tech check, delegation, scripts per hour. Sharing practical ideas.", icon: "⏱️" },
      { title: "Retention strategies", body: "Keeping good staff: pay, conditions, culture, development.", icon: "🔒" },
    ],
  },
  {
    id: "industry-strategy",
    title: "Industry Strategy",
    description: "Future of independent pharmacies.",
    topics: [
      { title: "Financial benchmarks for healthy pharmacies", body: "What KPIs do you track? Gross margin, inventory days, labour cost %. Sharing benchmarks.", icon: "📊", badge: "Important" },
      { title: "Managing debt and financing expansion", body: "Borrowing for fit-out, acquisition or working capital. What lenders look for and tips.", icon: "🏦" },
      { title: "High-margin OTC products", body: "Which OTC lines deliver the best margin? Category and brand experiences.", icon: "💊" },
      { title: "Data-driven assortment decisions", body: "Using sales and margin data to add or remove lines. Tools and processes.", icon: "📉" },
      { title: "Vaccination services", body: "Flu, COVID, travel. Revenue, setup, staffing and demand in your area.", icon: "💉" },
      { title: "Health clinics inside pharmacies", body: "Minor ailments, wound care, BP, diabetes. What services have you added?", icon: "🩺" },
      { title: "Subscription medication services", body: "Repeat dispensing, dose administration aids, compliance. Revenue and operational impact.", icon: "📅" },
      { title: "Partnerships with local doctors", body: "Working with GPs: referrals, chronic disease, medication reviews. What works?", icon: "🤝" },
      { title: "Which KPIs every pharmacy should track", body: "Sales, margin, script volume, inventory turnover, labour cost. Your essential dashboard.", icon: "📈" },
      { title: "Using sales data for purchasing decisions", body: "Demand forecasting and reorder points. Avoiding overstock and stockouts.", icon: "📉" },
      { title: "Tools for independent pharmacies", body: "Software, POS, dispensing, reporting. What do you use and recommend?", icon: "🛠️" },
    ],
  },
];

type Author = { id: string; name: string | null; isVerified: boolean | null; state: string | null };
type Topic = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  _count: { replies: number };
};

function insertAtCursor(
  value: string,
  setValue: (v: string | ((prev: string) => string)) => void,
  emoji: string,
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
) {
  const el = inputRef?.current;
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

type ForumPageClientProps = { currentUserId: string };

export default function ForumPageClient({ currentUserId }: ForumPageClientProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDeleteTopic = async (topicId: string) => {
    setDeletingId(topicId);
    setError(null);
    try {
      const res = await fetch(`/api/forum/${topicId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? "Failed to delete");
      }
      await fetchTopics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete topic");
    } finally {
      setDeletingId(null);
    }
  };

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      const active = document.activeElement;
      if (active === titleInputRef.current) {
        insertAtCursor(title, setTitle, emoji, titleInputRef);
      } else if (active === bodyTextareaRef.current) {
        insertAtCursor(body, setBody, emoji, bodyTextareaRef);
      } else {
        insertAtCursor(body, setBody, emoji, bodyTextareaRef);
      }
    },
    [title, body]
  );

  const startSuggestedTopic = (suggested: SuggestedTopic) => {
    setTitle(suggested.title);
    setBody(suggested.body);
    setShowForm(true);
  };

  const fetchTopics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forum", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.message === "string" ? data.message : "Failed to load topics";
        throw new Error(data?.detail ? `${msg} (${data.detail})` : msg);
      }
      setTopics(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/forum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.message === "string" ? data.message : "Failed to create topic";
        throw new Error(msg);
      }
      setTitle("");
      setBody("");
      setShowForm(false);
      await fetchTopics();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create topic");
    } finally {
      setSubmitting(false);
    }
  };

  const clearError = () => setError(null);

  const inputClass =
    "w-full px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      {/* Left: header, suggested topics, new topic form */}
      <div className="lg:col-span-7 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-heading font-bold text-gold">Community forum</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] font-medium hover:opacity-90 shrink-0"
        >
          {showForm ? "Cancel" : "New topic"}
        </button>
      </div>

      {/* Forum sections — business-focused discussion starters */}
      <section className="space-y-6">
        <div className="rounded-xl border border-gold/30 bg-gradient-to-b from-gold/5 to-transparent p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-gold mb-1 flex items-center gap-2">
            <span aria-hidden>💬</span>
            Suggested topics by area
          </h2>
          <p className="text-white/60 text-sm mb-4">
            Pick a topic to open a public thread. Everyone can see and reply — like a public chatroom.
          </p>
        </div>
        {FORUM_SECTIONS.map((section) => (
          <div key={section.id} className="rounded-xl border border-[rgba(161,130,65,0.25)] bg-mid-navy/50 p-4 sm:p-5">
            <h3 className="text-base font-semibold text-gold mb-0.5">{section.title}</h3>
            <p className="text-white/50 text-sm mb-4">{section.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.topics.map((suggested, i) => (
                <button
                  key={`${section.id}-${i}`}
                  type="button"
                  onClick={() => startSuggestedTopic(suggested)}
                  className="text-left p-3 rounded-lg bg-mid-navy/80 border border-[rgba(161,130,65,0.25)] hover:border-gold/40 hover:bg-mid-navy transition"
                >
                  <span className="text-xl mb-2 block" aria-hidden>
                    {suggested.icon}
                  </span>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-white text-sm line-clamp-2">
                      {suggested.title}
                    </span>
                    {suggested.badge && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gold/20 text-gold">
                        {suggested.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-xs line-clamp-2">{suggested.body}</p>
                  <span className="mt-2 inline-block text-xs text-gold font-medium">
                    Discuss →
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="p-4 rounded-xl bg-mid-navy border border-[rgba(161,130,65,0.3)] space-y-3"
        >
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Topic title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className={inputClass}
            required
          />
          <div className="space-y-1">
            <ForumEmojiBar onInsert={handleInsertEmoji} label="Emoji" />
            <textarea
              ref={bodyTextareaRef}
              placeholder="Your message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={5000}
              className={inputClass + " resize-y min-h-[100px]"}
              required
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Posting…" : "Post topic"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-[rgba(161,130,65,0.4)] text-white/80 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      </div>

      {/* Right: Active discussions */}
      <aside className="lg:col-span-5">
        <h2 className="text-lg font-semibold text-white/90 mb-1">Active discussions</h2>
        <p className="text-white/50 text-sm mb-3">All topics and replies are public.</p>
        {error && (
          <div className="flex flex-wrap items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3">
            <span>{error}</span>
            <button type="button" onClick={() => { clearError(); fetchTopics(); }} className="underline hover:no-underline">
              Dismiss
            </button>
          </div>
        )}
        {loading ? (
          <p className="text-white/60">Loading topics…</p>
        ) : topics.length === 0 && !error ? (
          <p className="text-white/60">No topics yet. Start the discussion or pick a suggested topic.</p>
        ) : !error ? (
          <ul className="space-y-3">
            {topics.map((t) => (
              <li key={t.id} className="relative">
                <Link
                  href={`/forum/${t.id}`}
                  prefetch={false}
                  className="block p-4 pr-24 rounded-xl bg-mid-navy border border-[rgba(161,130,65,0.3)] hover:border-gold/40 transition"
                >
                  <h2 className="font-semibold text-white mb-1">{t.title}</h2>
                  <p className="text-white/70 text-sm line-clamp-2 mb-2">{t.body}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                    <span>{t.author.name ?? "Pharmacy"}</span>
                    {t.author.isVerified && <span className="text-gold">Verified</span>}
                    <span>{t._count.replies} reply{t._count.replies !== 1 ? "s" : ""}</span>
                    <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Link>
                {t.author.id === currentUserId && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteTopic(t.id); }}
                    disabled={deletingId === t.id}
                    className="absolute top-3 right-3 text-xs text-white/70 hover:text-red-400 disabled:opacity-50"
                  >
                    {deletingId === t.id ? "Deleting…" : "Delete"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </aside>
    </div>
  );
}
