"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function VerificationActions({ pharmacyId }: { pharmacyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function handleApprove() {
    setLoading("approve");
    try {
      const res = await fetch(`/api/admin/verify/${pharmacyId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Failed to approve");
        setLoading(null);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.emailSent === false) {
        const reason = data.emailError
          ? ` Reason: ${data.emailError}`
          : " Add RESEND_API_KEY to .env and restart the server.";
        toast.warning(
          `Pharmacy approved, but the welcome email was not sent.${reason}`
        );
      } else {
        toast.success("Pharmacy approved. Welcome email sent.");
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(null);
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("Enter a reason for rejection");
      return;
    }
    setLoading("reject");
    try {
      const res = await fetch(`/api/admin/reject/${pharmacyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message ?? "Failed to reject");
        setLoading(null);
        return;
      }
      toast.success("Rejection email sent.");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(null);
    setShowReject(false);
    setRejectReason("");
  }

  if (showReject) {
    return (
      <div className="space-y-2">
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection (required)"
          className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded text-sm text-white placeholder-white/50"
          rows={2}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setShowReject(false);
              setRejectReason("");
            }}
            className="text-sm text-white/70 hover:underline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={loading === "reject"}
            className="text-sm bg-error text-white px-3 py-1 rounded disabled:opacity-50"
          >
            Send rejection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleApprove}
        disabled={!!loading}
        className="text-sm bg-success text-white px-3 py-1 rounded hover:bg-success/90 disabled:opacity-50"
      >
        {loading === "approve" ? "…" : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => setShowReject(true)}
        disabled={!!loading}
        className="text-sm border border-error text-error px-3 py-1 rounded hover:bg-error/5 disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}
