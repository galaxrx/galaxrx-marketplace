"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import LogoUpload from "./LogoUpload";
import SellerPayoutTimingNotice from "@/components/account/SellerPayoutTimingNotice";

type Pharmacy = {
  name: string;
  email: string;
  abn: string;
  address: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  approvalNumber: string;
  phone: string;
  mobile: string | null;
  logoUrl: string | null;
  isVerified: boolean;
  stripeAccountId: string | null;
  notifyNewSale: boolean;
  notifyPurchase: boolean;
  notifyNewMessage: boolean;
  notifyOrderShipped: boolean;
  notifyOrderDelivered: boolean;
  notifyWantedMatch: boolean;
};

type Props = { pharmacy: Pharmacy };

export default function SettingsClient({ pharmacy }: Props) {
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState(pharmacy.phone);
  const [mobile, setMobile] = useState(pharmacy.mobile ?? "");
  const [postcode, setPostcode] = useState(() =>
    (pharmacy.postcode ?? "").replace(/\D/g, "").slice(0, 4)
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    notifyNewSale: pharmacy.notifyNewSale,
    notifyPurchase: pharmacy.notifyPurchase,
    notifyNewMessage: pharmacy.notifyNewMessage,
    notifyOrderShipped: pharmacy.notifyOrderShipped,
    notifyOrderDelivered: pharmacy.notifyOrderDelivered,
    notifyWantedMatch: pharmacy.notifyWantedMatch,
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeDisconnectLoading, setStripeDisconnectLoading] = useState(false);
  const [stripeNeedsReconnect, setStripeNeedsReconnect] = useState(false);

  useEffect(() => {
    if (!pharmacy.stripeAccountId) {
      setStripeNeedsReconnect(false);
      return;
    }
    let cancelled = false;
    fetch("/api/stripe/connect-status")
      .then((r) => r.json())
      .then((d: { needsSellerReconnect?: boolean; reason?: string }) => {
        if (cancelled) return;
        if (d.needsSellerReconnect || d.reason === "ACCOUNT_NOT_FOUND") {
          setStripeNeedsReconnect(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pharmacy.stripeAccountId]);

  useEffect(() => {
    const stripe = searchParams.get("stripe");
    if (stripe === "success") {
      toast.success("Bank account connected successfully ✓");
      window.history.replaceState({}, "", "/settings");
    } else if (stripe === "refresh") {
      toast.error("Stripe setup incomplete. Please try again.");
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  async function saveProfile() {
    const pc = postcode.replace(/\D/g, "").slice(0, 4);
    if (pc.length < 4) {
      toast.error("Enter a valid 4-digit Australian postcode (required for shipping quotes).");
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mobile: mobile || null, postcode: pc }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to save");
        setProfileSaving(false);
        return;
      }
      toast.success("Profile updated");
    } catch {
      toast.error("Something went wrong");
    }
    setProfileSaving(false);
  }

  async function saveLogoUrl(url: string) {
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: url }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Logo updated");
    } catch {
      toast.error("Failed to save logo");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to change password");
        setPasswordSaving(false);
        return;
      }
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Something went wrong");
    }
    setPasswordSaving(false);
  }

  async function saveNotifications() {
    setNotifSaving(true);
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifications),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Preferences saved");
    } catch {
      toast.error("Failed to save");
    }
    setNotifSaving(false);
  }

  async function connectStripe() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect-onboard", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to start onboarding");
        setStripeLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return; // keep "Redirecting…" until page unloads
      }
      toast.error("No redirect URL received. Please try again.");
    } catch {
      toast.error("Something went wrong. Check your connection and try again.");
    }
    setStripeLoading(false);
  }

  async function disconnectStripe() {
    setStripeDisconnectLoading(true);
    try {
      const res = await fetch("/api/stripe/connect-disconnect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to disconnect");
        setStripeDisconnectLoading(false);
        return;
      }
      toast.success(data.message ?? "Disconnected. You can connect again for live payments.");
      window.location.reload();
    } catch {
      toast.error("Something went wrong.");
    }
    setStripeDisconnectLoading(false);
  }

  const inputClass =
    "w-full max-w-md bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-gold focus:border-gold/50";

  return (
    <div className="space-y-8">
      {/* Section 1 — Pharmacy profile */}
      <section className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6">
        <h2 className="font-heading font-semibold text-lg text-white mb-4">Pharmacy profile</h2>
        <div className="space-y-4">
          <p className="text-sm text-white/80">
            <strong className="text-white">Name:</strong> {pharmacy.name}
            <br />
            <strong className="text-white">ABN:</strong> {pharmacy.abn}
            <br />
            <strong className="text-white">Approval #:</strong> {pharmacy.approvalNumber}
            <br />
            <strong className="text-white">Street address:</strong> {[pharmacy.address, pharmacy.suburb, pharmacy.state].filter(Boolean).join(", ")}
          </p>
          <p className="text-xs text-white/60 italic mb-3">
            To update pharmacy name, ABN or full street address, email galaxrx.team@gmail.com
          </p>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Postcode (Australia Post &amp; shipping)
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className={`${inputClass} max-w-[8rem]`}
              placeholder="e.g. 2112"
            />
            <p className="text-xs text-white/50 mt-1">
              Must be a real Australian postcode (not 0000). Used when buyers get live postage quotes.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Phone (required)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Mobile (optional)</label>
            <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Logo</label>
            <LogoUpload currentLogoUrl={pharmacy.logoUrl} onUploadComplete={saveLogoUrl} />
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={profileSaving}
            className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
          >
            {profileSaving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </section>

      {/* Section 2 — Change password */}
      <section className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6">
        <h2 className="font-heading font-semibold text-lg text-white mb-4">Change password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">New password (min 8 characters)</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={inputClass} />
          </div>
          <button
            type="submit"
            disabled={passwordSaving}
            className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
          >
            {passwordSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      {/* Section 3 — Stripe Connect */}
      <section className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6">
        <h2 className="font-heading font-semibold text-lg text-white mb-2">Bank account (Stripe Connect)</h2>
        <p className="text-sm text-white/70 mb-4">Connect your bank account to receive payments from sales.</p>
        {stripeNeedsReconnect && (
          <div
            className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            role="status"
          >
            <strong className="text-amber-200">Action required:</strong> Stripe does not recognise the saved payout
            account (common after switching from test to live keys). Use{" "}
            <strong className="text-white">Reconnect for live payments</strong> below, complete onboarding, so buyers
            can pay you.
          </div>
        )}
        <SellerPayoutTimingNotice className="mb-5" />
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`text-sm px-2 py-1 rounded ${
              pharmacy.stripeAccountId ? "bg-success/20 text-success" : "bg-error/20 text-error"
            }`}
          >
            {pharmacy.stripeAccountId ? "Connected ✓" : "Not connected"}
          </span>
          {pharmacy.stripeAccountId ? (
            <>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline">
                Manage Stripe account →
              </a>
              <button
                type="button"
                onClick={disconnectStripe}
                disabled={stripeDisconnectLoading}
                className="text-sm text-amber-400 hover:text-amber-300 underline disabled:opacity-50"
                title="If you see 'No such destination' at checkout, disconnect then connect again to create a live Stripe account."
              >
                {stripeDisconnectLoading ? "Disconnecting…" : "Reconnect for live payments"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={connectStripe}
              disabled={stripeLoading}
              className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
            >
              {stripeLoading ? "Redirecting…" : "Connect bank account →"}
            </button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-semibold text-gold mb-3">How to connect your bank details</h3>
          <ol className="space-y-2 text-sm text-white/80 list-decimal list-inside">
            <li>Click <strong className="text-white">Connect bank account</strong> above. You’ll be taken to Stripe (our secure payment partner).</li>
            <li>Sign in with Google or email, or create a Stripe account. You don’t need a Stripe account to pay on GalaxRX—only to receive payouts.</li>
            <li>Enter your <strong className="text-white">business details</strong> (pharmacy name, ABN, address) so they match your GalaxRX profile.</li>
            <li>Add your <strong className="text-white">bank account</strong> (BSB and account number). Stripe will verify it; this usually takes a few minutes.</li>
            <li>Complete any identity checks if Stripe asks. This keeps the platform secure for everyone.</li>
            <li>When you see <span className="text-success">Connected ✓</span> back here, you’re done. Buyers can pay you; payouts reach your bank after Stripe’s pending period and your payout schedule (see notice above).</li>
          </ol>
          <p className="mt-3 text-xs text-white/50">
            Payments are processed by Stripe. Your bank details are never stored on GalaxRX. If you have trouble, try again in a few minutes or use a different browser.
          </p>
        </div>
      </section>

      {/* Section 4 — Notifications */}
      <section className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-6">
        <h2 className="font-heading font-semibold text-lg text-white mb-4">Email notifications</h2>
        <div className="space-y-3">
          {[
            { key: "notifyNewSale" as const, label: "New sale notification" },
            { key: "notifyPurchase" as const, label: "Purchase confirmed" },
            { key: "notifyNewMessage" as const, label: "New message received" },
            { key: "notifyOrderShipped" as const, label: "Order shipped (tracking entered)" },
            { key: "notifyOrderDelivered" as const, label: "Order delivered" },
            { key: "notifyWantedMatch" as const, label: "New listing matching my wanted items" },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer text-white/90">
              <input
                type="checkbox"
                checked={notifications[key]}
                onChange={(e) => setNotifications((n) => ({ ...n, [key]: e.target.checked }))}
                className="rounded border-[rgba(161,130,65,0.4)] bg-white/5 text-gold focus:ring-gold"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={saveNotifications}
          disabled={notifSaving}
          className="mt-4 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50"
        >
          {notifSaving ? "Saving…" : "Save preferences"}
        </button>
      </section>
    </div>
  );
}
