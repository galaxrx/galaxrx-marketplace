"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

const UnreadCountContext = createContext<{
  count: number;
  refresh: () => void;
}>({ count: 0, refresh: () => {} });

const POLL_INTERVAL_MS = 45_000; // single shared poll

export function UnreadCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const inFlightRef = useRef(false);

  const fetchCount = useCallback(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    fetch("/api/messages/unread-count")
      .then((res) => res.json())
      .then((data) => setCount(data.count ?? 0))
      .catch(() => {})
      .finally(() => { inFlightRef.current = false; });
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <UnreadCountContext.Provider value={{ count, refresh: fetchCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount() {
  return useContext(UnreadCountContext);
}
