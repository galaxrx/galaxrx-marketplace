"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ListingRowActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    if (!confirm("Deactivate this listing? It will no longer appear in search.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "Failed to deactivate");
        setLoading(false);
        return;
      }
      toast.success("Listing deactivated");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  async function handleReactivate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "Failed to reactivate");
        setLoading(false);
        return;
      }
      toast.success("Listing reactivated");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/listings/${id}`} className="text-gold text-sm hover:underline">
        View
      </Link>
      <Link href={`/sell?edit=${id}`} className="text-gold text-sm hover:underline">
        Edit
      </Link>
      <Link href={`/sell?repeat=${id}`} className="text-gold text-sm hover:underline">
        Repeat
      </Link>
      {isActive ? (
        <button
          type="button"
          onClick={handleDeactivate}
          disabled={loading}
          className="text-error text-sm hover:underline disabled:opacity-50"
        >
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          onClick={handleReactivate}
          disabled={loading}
          className="text-success text-sm hover:underline disabled:opacity-50"
        >
          Reactivate
        </button>
      )}
    </div>
  );
}
