"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function UserDeleteButton({
  userId,
  userName,
  userEmail,
  isAdmin,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  isAdmin: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to delete user");
        setLoading(false);
        setConfirming(false);
        return;
      }
      toast.success("User deleted. They can sign up again with the same email.");
      window.location.reload();
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
      setConfirming(false);
    }
  }

  if (isAdmin) {
    return (
      <span className="text-white/40 text-xs">Admin</span>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-warning">Delete {userName}?</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="text-xs px-2 py-0.5 border border-white/30 rounded text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="text-xs px-2 py-0.5 bg-error text-white rounded hover:bg-error/90 disabled:opacity-50"
          >
            {loading ? "…" : "Yes, delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs text-error hover:underline"
      title={`Delete ${userEmail}. They can sign up again later.`}
    >
      Delete
    </button>
  );
}
