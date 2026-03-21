"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ClearListingHoldsButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClear() {
    if (
      !confirm(
        "Clear all open checkout holds on this listing? Only do this if no customer is paying right now. The item will show on Buy Items again."
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/clear-holds`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Could not clear holds");
        return;
      }
      toast.success("Checkout holds cleared. Listing should appear on Buy Items.");
      router.refresh();
    } catch {
      toast.error("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClear}
      disabled={loading}
      className="mt-1 text-xs text-gold hover:underline disabled:opacity-50 block"
    >
      {loading ? "…" : "Clear holds & show on Buy Items"}
    </button>
  );
}
