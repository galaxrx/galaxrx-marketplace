"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { CART_TTL_MS } from "@/lib/checkout-ttl";

export type CartItem = {
  listingId: string;
  quantity: number;
};

const STORAGE_KEY = "galaxrx-cart-v2";

type PersistedCart = {
  v: 2;
  savedAt: number;
  items: CartItem[];
};

function cleanItems(raw: unknown[]): CartItem[] {
  return raw
    .filter(
      (x): x is CartItem =>
        x &&
        typeof x === "object" &&
        typeof (x as CartItem).listingId === "string" &&
        typeof (x as CartItem).quantity === "number" &&
        (x as CartItem).quantity >= 1
    )
    .map((x) => ({
      listingId: x.listingId,
      quantity: Math.floor(x.quantity),
    }));
}

type CartContextValue = {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  /** Last activity timestamp; cart clears CART_TTL_MS after this. */
  cartSavedAt: number | null;
  cartTtlMinutes: number;
  addItem: (listingId: string, quantity: number) => void;
  setQuantity: (listingId: string, quantity: number) => void;
  removeItem: (listingId: string) => void;
  removeItems: (listingIds: string[]) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartSavedAt, setCartSavedAt] = useState<number | null>(null);
  const expiredOnLoadRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const legacy = localStorage.getItem("galaxrx-cart-v1");
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy) as unknown;
            if (Array.isArray(parsed)) {
              const cleaned = cleanItems(parsed);
              const savedAt = Date.now();
              if (cleaned.length > 0) {
                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify({ v: 2, savedAt, items: cleaned } satisfies PersistedCart)
                );
                setItems(cleaned);
                setCartSavedAt(savedAt);
              }
              localStorage.removeItem("galaxrx-cart-v1");
            }
          } catch {
            localStorage.removeItem("galaxrx-cart-v1");
          }
        }
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as PersistedCart).v === 2 &&
        Array.isArray((parsed as PersistedCart).items) &&
        typeof (parsed as PersistedCart).savedAt === "number"
      ) {
        const p = parsed as PersistedCart;
        if (Date.now() - p.savedAt > CART_TTL_MS) {
          localStorage.removeItem(STORAGE_KEY);
          expiredOnLoadRef.current = true;
          setItems([]);
          setCartSavedAt(null);
        } else {
          setItems(cleanItems(p.items));
          setCartSavedAt(p.savedAt);
        }
      } else if (Array.isArray(parsed)) {
        const cleaned = cleanItems(parsed);
        const savedAt = Date.now();
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ v: 2, savedAt, items: cleaned } satisfies PersistedCart)
        );
        setItems(cleaned);
        setCartSavedAt(cleaned.length > 0 ? savedAt : null);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !expiredOnLoadRef.current) return;
    expiredOnLoadRef.current = false;
    toast.info("Your cart expired after 10 minutes. It was cleared.");
  }, [hydrated]);

  const persist = useCallback((next: CartItem[]) => {
    const savedAt = Date.now();
    if (next.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      setCartSavedAt(null);
      return;
    }
    setCartSavedAt(savedAt);
    const payload: PersistedCart = { v: 2, savedAt, items: next };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, []);

  useEffect(() => {
    if (!hydrated || items.length === 0 || cartSavedAt == null) return;
    const check = () => {
      if (Date.now() - cartSavedAt > CART_TTL_MS) {
        setItems([]);
        setCartSavedAt(null);
        localStorage.removeItem(STORAGE_KEY);
        toast.info("Your cart expired after 10 minutes of inactivity.");
      }
    };
    const id = setInterval(check, 8000);
    check();
    return () => clearInterval(id);
  }, [hydrated, items.length, cartSavedAt]);

  const addItem = useCallback(
    (listingId: string, quantity: number) => {
      const q = Math.max(1, Math.floor(quantity));
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.listingId === listingId);
        let next: CartItem[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = {
            listingId,
            quantity: next[idx].quantity + q,
          };
        } else {
          next = [...prev, { listingId, quantity: q }];
        }
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setQuantity = useCallback(
    (listingId: string, quantity: number) => {
      const q = Math.max(1, Math.floor(quantity));
      setItems((prev) => {
        const next = prev.map((i) =>
          i.listingId === listingId ? { ...i, quantity: q } : i
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeItem = useCallback(
    (listingId: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.listingId !== listingId);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeItems = useCallback(
    (listingIds: string[]) => {
      const set = new Set(listingIds);
      setItems((prev) => {
        const next = prev.filter((i) => !set.has(i.listingId));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    persist([]);
  }, [persist]);

  const itemCount = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );

  const cartTtlMinutes = CART_TTL_MS / 60_000;

  const value = useMemo(
    () => ({
      items,
      hydrated,
      itemCount,
      cartSavedAt,
      cartTtlMinutes,
      addItem,
      setQuantity,
      removeItem,
      removeItems,
      clearCart,
    }),
    [
      items,
      hydrated,
      itemCount,
      cartSavedAt,
      cartTtlMinutes,
      addItem,
      setQuantity,
      removeItem,
      removeItems,
      clearCart,
    ]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
