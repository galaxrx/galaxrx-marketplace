"use client";

import { useSession } from "next-auth/react";
import { useRef, useEffect, useState } from "react";

/**
 * When the user signs in with a different account in another tab, the session
 * cookie is shared, so this tab's data (listings, wanted items, etc.) can be
 * from the previous user while the header might update. This component
 * detects when the session user has changed (e.g. after refetch on focus) and
 * shows a banner asking the user to refresh so all data matches the current account.
 */
export default function SessionChangeBanner() {
  const { data: session, status } = useSession();
  const initialUserIdRef = useRef<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [newUserName, setNewUserName] = useState<string>("");

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const userId = (session.user as { id?: string }).id;
    const name = session.user.name ?? "Another account";
    if (!userId) return;

    if (initialUserIdRef.current === null) {
      initialUserIdRef.current = userId;
      return;
    }
    if (initialUserIdRef.current !== userId) {
      initialUserIdRef.current = userId;
      setNewUserName(name);
      setShowBanner(true);
    }
  }, [status, session]);

  if (!showBanner) return null;

  return (
    <div
      role="alert"
      className="fixed top-20 left-0 right-0 z-50 mx-4 md:ml-[14rem] md:mr-4 rounded-lg bg-amber-500/95 text-[#0D1B2A] px-4 py-3 shadow-lg border border-amber-400 flex flex-wrap items-center justify-between gap-2"
    >
      <p className="text-sm font-medium">
        You signed in as <strong>{newUserName}</strong> in another tab. Refresh this page to see the correct data (listings, wanted items, etc.).
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 px-4 py-2 bg-[#0D1B2A] text-gold rounded-lg font-semibold text-sm hover:opacity-90"
      >
        Refresh page
      </button>
    </div>
  );
}
