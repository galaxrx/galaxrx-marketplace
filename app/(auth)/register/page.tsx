"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { parseAustralianAddress } from "@/lib/address-utils";

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

const REGISTER_DRAFT_KEY = "galaxrx_register_draft";

const initialForm = {
  pharmacyCode: "", // step 0: code entered for verification
  name: "",
  abn: "",
  approvalNumber: "",
  address: "",
  suburb: "",
  state: "NSW" as (typeof AU_STATES)[number],
  postcode: "",
  latitude: null as number | null,
  longitude: null as number | null,
  phone: "",
  mobile: "",
  email: "",
  password: "",
  confirmPassword: "",
  agreeTerms: false,
  verificationDocs: [] as string[],
};

type FormState = typeof initialForm;

function loadDraft(): { step: number; form: Partial<FormState> } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { step?: number; form?: Partial<FormState> };
    if (!parsed.form || typeof parsed.step !== "number") return null;
    return { step: Math.min(5, Math.max(0, parsed.step)), form: parsed.form };
  } catch {
    return null;
  }
}

function saveDraft(step: number, form: FormState) {
  if (typeof window === "undefined") return;
  try {
    const { password: _p, confirmPassword: _c, ...rest } = form;
    sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify({ step, form: rest }));
  } catch {
    // ignore
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch {
    // ignore
  }
}

const FINAL_STEP = 4; // 0=pharmacy code, 1=details, 2=contact, 3=email verify, 4=review

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [hydrated, setHydrated] = useState(false);

  // Restore draft when user returns from Terms/Privacy or browser back
  useEffect(() => {
    const draft = loadDraft();
    if (draft?.form) {
      setStep(draft.step);
      setForm((prev) => ({
        ...prev,
        ...draft.form,
        password: "", // never restore password
        confirmPassword: "",
        verificationDocs: Array.isArray(draft.form?.verificationDocs) ? draft.form.verificationDocs : prev.verificationDocs,
      }));
    }
    setHydrated(true);
  }, []);

  // Persist form and step so data survives navigation away (e.g. to Terms/Privacy)
  useEffect(() => {
    if (!hydrated) return;
    saveDraft(step, form);
  }, [hydrated, step, form]);

  function update(f: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...f }));
  }

  async function handleVerifyCode() {
    if (!form.pharmacyCode.trim()) {
      setError("Please enter your pharmacy registration code.");
      return;
    }
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.pharmacyCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not verify pharmacy. Please check the code and try again.");
        setVerifying(false);
        return;
      }
      const code = form.pharmacyCode.trim();
      const p = data.pharmacy as { name?: string; address?: string; suburb?: string; state?: string; postcode?: string; abn?: string; approvalNumber?: string } | undefined;
      // Pre-fill from API: address (street), suburb, state, postcode as separate required fields
      setForm((prev) => {
        const next = { ...prev };
        next.approvalNumber = (p?.approvalNumber != null && p.approvalNumber !== "") ? p.approvalNumber : (prev.approvalNumber || code);
        if (p) {
          if (p.name != null && p.name !== "") next.name = p.name;
          if (p.address != null && p.address !== "") {
            const parsed = parseAustralianAddress(p.address);
            next.address = parsed.street || p.address;
            if (parsed.suburb) next.suburb = parsed.suburb;
            if (parsed.state) next.state = (parsed.state as typeof form.state) || prev.state;
            if (parsed.postcode) next.postcode = parsed.postcode;
          }
          if (p.suburb != null && p.suburb !== "") next.suburb = p.suburb;
          if (p.state != null && p.state !== "") next.state = (p.state as typeof form.state) || prev.state;
          if (p.postcode != null && p.postcode !== "") next.postcode = p.postcode;
          if (p.abn != null && p.abn !== "") next.abn = p.abn;
        }
        return next;
      });
      setStep(1);
    } catch {
      setError("Verification failed. Please try again.");
    }
    setVerifying(false);
  }

  function validateStep1() {
    if (!form.name.trim()) return "Pharmacy name is required.";
    if (!/^\d{11}$/.test(form.abn.replace(/\s/g, ""))) return "ABN must be 11 digits.";
    if (!form.approvalNumber.trim()) return "Pharmacy approval number is required.";
    if (!form.address.trim()) return "Address (street) is required.";
    if (!form.suburb.trim()) return "Suburb is required.";
    if (!form.state.trim()) return "State is required.";
    if (!form.postcode.trim()) return "Postcode is required.";
    return null;
  }

  function validateStep2() {
    if (!form.mobile.trim()) return "Mobile is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    if (!form.agreeTerms) return "You must agree to the Terms & Conditions.";
    return null;
  }

  async function handleSendVerificationCode() {
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }
    setError("");
    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Could not send code. Please try again.");
        setSendingCode(false);
        return;
      }
      setError("");
    } catch {
      setError("Failed to send code. Please try again.");
    }
    setSendingCode(false);
  }

  async function handleVerifyEmail() {
    const code = verificationCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.message ?? "Invalid or expired code. Try again or request a new code.");
        setVerifying(false);
        return;
      }
      setStep(4);
      setError("");
    } catch {
      setError("Verification failed. Please try again.");
    }
    setVerifying(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 0) {
      await handleVerifyCode();
      return;
    }
    if (step === 3) {
      await handleVerifyEmail();
      return;
    }
    if (step < FINAL_STEP) {
      const err = step === 1 ? validateStep1() : validateStep2();
      if (err) {
        setError(err);
        return;
      }
      setError("");
      setStep(step + 1);
      if (step === 2) handleSendVerificationCode();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const parsedAddr = parseAustralianAddress(form.address);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          abn: form.abn.replace(/\s/g, ""),
          approvalNumber: form.approvalNumber,
          address: parsedAddr.street || form.address,
          suburb: form.suburb || parsedAddr.suburb || "",
          state: (form.state || parsedAddr.state) as (typeof form.state),
          postcode: form.postcode || parsedAddr.postcode || "",
          latitude: form.latitude ?? undefined,
          longitude: form.longitude ?? undefined,
          phone: form.phone.trim() || form.mobile.trim(),
          mobile: form.mobile || undefined,
          email: form.email,
          password: form.password,
          verificationDocs: form.verificationDocs,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message ?? "Registration failed.");
        setLoading(false);
        return;
      }
      clearDraft();
      window.location.href = "/register/success";
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  const inputClass = "w-full max-w-md px-4 py-2 bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";
  const labelClass = "block text-sm font-medium mb-1 text-white/80";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A] p-4 py-12">
      <div className="w-full max-w-lg bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl shadow-xl p-8">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-heading font-bold text-gold">
            GalaxRX
          </Link>
          <p className="mt-2 text-white/60 text-sm">Pharmacy registration</p>
          <div className="mt-4 flex gap-2 justify-center">
            {[0, 1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 max-w-24 rounded-full ${step >= s ? "bg-gold" : "bg-white/20"}`}
              />
            ))}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-error/10 text-error text-sm p-3 rounded-md">{error}</div>
          )}
          {step === 0 && (
            <>
              <div>
                <label className={labelClass}>Pharmacy registration code *</label>
                <input
                  value={form.pharmacyCode}
                  onChange={(e) => update({ pharmacyCode: e.target.value })}
                  placeholder="Enter your pharmacy registration or approval number"
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
              <p className="text-white/50 text-sm">
                Enter the code from the Register of Pharmacies. We&apos;ll verify it before you continue.
              </p>
            </>
          )}
          {step === 1 && (
            <>
              <p className="text-white/60 text-sm mb-2">
                Pre-filled from the register. You can edit any field if something is wrong.
              </p>
              <div>
                <label className={labelClass}>Pharmacy name *</label>
                <input value={form.name} onChange={(e) => update({ name: e.target.value })} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>ABN (11 digits) *</label>
                <input value={form.abn} onChange={(e) => update({ abn: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="12345678901" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Pharmacy approval number *</label>
                <input value={form.approvalNumber} onChange={(e) => update({ approvalNumber: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Address (street / unit) *</label>
                <input
                  value={form.address}
                  onChange={(e) => {
                    const value = e.target.value;
                    const parsed = parseAustralianAddress(value);
                    update({
                      address: value,
                      suburb: parsed.suburb ?? form.suburb,
                      state: (parsed.state as typeof form.state) || form.state,
                      postcode: parsed.postcode ?? form.postcode,
                    });
                  }}
                  className={inputClass}
                  placeholder="Unit and street (e.g. Shop 1 46-48 Blaxland Road)"
                />
              </div>
              <div>
                <label className={labelClass}>Suburb / City *</label>
                <input value={form.suburb} onChange={(e) => update({ suburb: e.target.value })} className={inputClass} placeholder="e.g. RYDE" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>State *</label>
                  <select value={form.state} onChange={(e) => update({ state: e.target.value as typeof form.state })} className={inputClass + " appearance-none cursor-pointer"}>
                    {AU_STATES.map((s) => (
                      <option key={s} value={s} className="bg-[#0D1B2A] text-white">{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Postcode *</label>
                  <input value={form.postcode} onChange={(e) => update({ postcode: e.target.value.replace(/\D/g, "").slice(0, 4) })} className={inputClass} placeholder="e.g. 2112" />
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => update({ phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Mobile *</label>
                <input type="tel" value={form.mobile} onChange={(e) => update({ mobile: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Password (min 8 characters) *</label>
                <input type="password" value={form.password} onChange={(e) => update({ password: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Confirm password *</label>
                <input type="password" value={form.confirmPassword} onChange={(e) => update({ confirmPassword: e.target.value })} className={inputClass} placeholder="Re-enter your password" />
              </div>
              <label className="flex items-start gap-2 text-white/80 text-sm">
                <input type="checkbox" checked={form.agreeTerms} onChange={(e) => update({ agreeTerms: e.target.checked })} className="mt-0.5 rounded border-[rgba(161,130,65,0.4)] bg-white/5 text-gold focus:ring-gold shrink-0" />
                <span>
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-medium">
                    Terms and Conditions
                  </Link>
                  {" "}and{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-medium">
                    Privacy Policy
                  </Link>
                  {" "}*
                </span>
              </label>
            </>
          )}
          {step === 3 && (
            <>
              <p className="text-white/80 text-sm">
                We&apos;ve sent a 6-digit code to <strong className="text-gold">{form.email}</strong>. Enter it below to verify your email.
              </p>
              <p className="text-white/50 text-sm">Check your inbox (and spam). Code expires in 15 minutes.</p>
              <div>
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={sendingCode}
                  className="text-gold text-sm font-medium hover:underline disabled:opacity-50"
                >
                  {sendingCode ? "Sending…" : "Send code again"}
                </button>
              </div>
              <div>
                <label className={labelClass}>Verification code *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={inputClass}
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </div>
            </>
          )}
          {step === 4 && (
            <div className="text-center py-4">
              <p className="text-white/60 text-sm">
                Upload your pharmacy registration certificate (PDF/JPG/PNG, max 10MB) via the link we&apos;ll send after you submit.
                You can add verification documents later in Settings.
              </p>
              <p className="mt-2 text-sm text-white/50">Click Submit to complete registration.</p>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2 border border-[rgba(161,130,65,0.4)] text-white/80 rounded-lg hover:bg-white/5">
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading || verifying}
              className="flex-1 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] py-2.5 rounded-xl font-bold hover:shadow-gold/30 disabled:opacity-50"
            >
              {verifying ? "Verifying…" : loading ? "Submitting…" : step === 0 ? "Verify" : step === 3 ? "Verify email" : step < FINAL_STEP ? "Continue" : "Submit"}
            </button>
          </div>
        </form>
        <p className="mt-6 text-center text-sm text-white/60">
          Already have an account? <Link href="/login" className="text-gold font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
