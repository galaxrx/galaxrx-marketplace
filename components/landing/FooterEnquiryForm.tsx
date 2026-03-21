"use client";

import { useState } from "react";

type Props = {
  contactEmail: string;
};

export default function FooterEnquiryForm({ contactEmail }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<"general" | "advertising">("general");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          topic,
          message,
          company: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Could not send. Please try again or email us directly.");
        return;
      }
      setStatus("success");
      setName("");
      setEmail("");
      setTopic("general");
      setMessage("");
    } catch {
      setStatus("error");
      setErrorMessage("Could not send. Please try again or email us directly.");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-5 text-sm text-white/85"
        role="status"
      >
        <p className="font-heading font-semibold text-gold mb-1">Message sent</p>
        <p className="text-white/65 leading-relaxed">
          Thank you — we&apos;ll get back to you soon. You can also reach us at{" "}
          <a href={`mailto:${contactEmail}`} className="text-gold hover:underline">
            {contactEmail}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-gold hover:text-gold/90"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4">
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0" aria-hidden>
        <label htmlFor="footer-enquiry-company">Company</label>
        <input
          id="footer-enquiry-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="footer-enquiry-name" className="block text-xs font-medium text-white/55 mb-1.5">
          Name
        </label>
        <input
          id="footer-enquiry-name"
          name="name"
          type="text"
          required
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/[0.12] bg-[#0D1B2A]/80 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="footer-enquiry-email" className="block text-xs font-medium text-white/55 mb-1.5">
          Email
        </label>
        <input
          id="footer-enquiry-email"
          name="email"
          type="email"
          required
          maxLength={320}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/[0.12] bg-[#0D1B2A]/80 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <span className="block text-xs font-medium text-white/55 mb-1.5">Topic</span>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-white/75">
            <input
              type="radio"
              name="topic"
              value="general"
              checked={topic === "general"}
              onChange={() => setTopic("general")}
              className="border-white/30 text-gold focus:ring-gold/40"
            />
            General enquiry
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-white/75">
            <input
              type="radio"
              name="topic"
              value="advertising"
              checked={topic === "advertising"}
              onChange={() => setTopic("advertising")}
              className="border-white/30 text-gold focus:ring-gold/40"
            />
            Advertising
          </label>
        </div>
      </div>
      <div>
        <label htmlFor="footer-enquiry-message" className="block text-xs font-medium text-white/55 mb-1.5">
          Message
        </label>
        <textarea
          id="footer-enquiry-message"
          name="message"
          required
          minLength={10}
          maxLength={8000}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-y rounded-lg border border-white/[0.12] bg-[#0D1B2A]/80 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
          placeholder="How can we help?"
        />
      </div>
      {status === "error" && errorMessage && (
        <p className="text-sm text-red-300/90" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-gold px-6 py-2.5 text-sm font-bold font-heading text-[#0D1B2A] hover:bg-gold/90 disabled:opacity-60 transition-colors"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
