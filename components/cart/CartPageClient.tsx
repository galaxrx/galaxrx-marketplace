"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useCart } from "@/components/providers/CartContext";
import BuyNowModal from "@/components/listings/BuyNowModal";
import {
  effectivePackSize,
  formatUnitPriceExGstDisplay,
  lineTotalExGstFromUnits,
} from "@/lib/listing-units";
import { CART_TTL_MS } from "@/lib/checkout-ttl";

type CartPreviewListing = {
  id: string;
  productName: string;
  pricePerPack: number;
  packSize: number;
  availableUnits: number;
  fulfillmentType: string;
  deliveryFee: number;
  pharmacyId: string;
  pharmacy: {
    id: string;
    name: string;
    suburb: string;
    state: string;
    postcode?: string | null;
    stripeAccountId?: string | null;
  };
  isGstFree: boolean | null;
  images: string[];
};

function previewToBuyListing(p: CartPreviewListing) {
  return {
    id: p.id,
    productName: p.productName,
    pricePerPack: p.pricePerPack,
    originalRRP: null as number | null,
    quantityUnits: p.availableUnits,
    availableUnits: p.availableUnits,
    isActive: true,
    fulfillmentType: p.fulfillmentType,
    deliveryFee: p.deliveryFee,
    pharmacyId: p.pharmacyId,
    pharmacy: {
      id: p.pharmacy.id,
      name: p.pharmacy.name,
      suburb: p.pharmacy.suburb,
      state: p.pharmacy.state,
      postcode: p.pharmacy.postcode ?? null,
      rating: 0,
      reviewCount: 0,
      tradeCount: 0,
      createdAt: new Date().toISOString(),
      isVerified: true,
      stripeAccountId: p.pharmacy.stripeAccountId ?? null,
    },
    isGstFree: p.isGstFree,
    images: p.images,
    packSize: p.packSize ?? 1,
  };
}

type Group = {
  sellerId: string;
  sellerName: string;
  lines: { listing: CartPreviewListing; quantity: number }[];
};

export default function CartPageClient() {
  const { items, hydrated, removeItem, setQuantity, removeItems, cartSavedAt, cartTtlMinutes } =
    useCart();
  const [listings, setListings] = useState<CartPreviewListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutGroup, setCheckoutGroup] = useState<Group | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (items.length === 0) return;
    const id = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(id);
  }, [items.length]);

  const cartMinutesLeft =
    cartSavedAt != null && items.length > 0
      ? Math.max(0, Math.ceil((CART_TTL_MS - (nowTick - cartSavedAt)) / 60_000))
      : 0;

  const load = useCallback(async () => {
    if (items.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/cart/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds: items.map((i) => i.listingId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Could not load cart");
        setListings([]);
        return;
      }
      const nextListings: CartPreviewListing[] = Array.isArray(data.listings)
        ? data.listings
        : [];
      setListings(nextListings);
      const returnedIds = new Set(nextListings.map((x) => x.id));
      const noLongerBuyable = items
        .map((i) => i.listingId)
        .filter((lid) => !returnedIds.has(lid));
      if (noLongerBuyable.length > 0) {
        removeItems(noLongerBuyable);
        toast.info(
          noLongerBuyable.length === 1
            ? "An item sold out or is no longer listed — removed from your cart."
            : `${noLongerBuyable.length} items sold out or are no longer listed — removed from your cart.`
        );
      }
      for (const cartItem of items) {
        const row = nextListings.find((x) => x.id === cartItem.listingId);
        if (!row) continue;
        const cap = Math.max(1, row.availableUnits);
        if (cartItem.quantity > cap) {
          setQuantity(cartItem.listingId, cap);
          toast.warning(
            `Not available at that quantity. Only ${cap} unit${cap !== 1 ? "s" : ""} left for "${row.productName}". Cart updated.`
          );
        }
      }
    } catch {
      toast.error("Could not load cart");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [items, removeItems, setQuantity]);

  useEffect(() => {
    if (!hydrated) return;
    load();
  }, [hydrated, load]);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    const refresh = () => load();
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [hydrated, items.length, load]);

  const listingById = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

  const groups = useMemo(() => {
    const map = new Map<string, Group>();
    for (const item of items) {
      const l = listingById.get(item.listingId);
      if (!l) continue;
      const q = Math.min(item.quantity, Math.max(1, l.availableUnits || 1));
      const sid = l.pharmacyId;
      if (!map.has(sid)) {
        map.set(sid, {
          sellerId: sid,
          sellerName: l.pharmacy.name,
          lines: [],
        });
      }
      map.get(sid)!.lines.push({ listing: l, quantity: q });
    }
    return Array.from(map.values());
  }, [items, listingById]);

  if (!hydrated) {
    return (
      <div className="text-white/60 py-12 text-center">Loading cart…</div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <p className="text-4xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold text-white mb-2">Your cart is empty</h1>
        <p className="text-white/60 mb-6">
          Add listings from the marketplace. Items from the same seller ship together in one
          payment.
        </p>
        <Link
          href="/buy"
          className="inline-flex items-center gap-2 bg-gold text-[#0d1b2a] px-6 py-3 rounded-lg font-semibold hover:opacity-90"
        >
          Browse listings
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Cart</h1>
        <p className="text-white/60 text-sm mt-1">
          Proceed to pay uses the same checkout as Buy Now — one payment per seller.
        </p>
        {items.length > 0 && cartSavedAt != null && (
          <div className="mt-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            <strong className="text-amber-50">10-minute cart:</strong> this cart empties{" "}
            {cartMinutesLeft < 1 ? (
              <span className="text-amber-200">within a minute</span>
            ) : (
              <>
                in ~<strong>{cartMinutesLeft}</strong> min
              </>
            )}{" "}
            if you don&apos;t add or change quantities. Checkout also holds stock for{" "}
            <strong>{cartTtlMinutes} min</strong> per payment attempt.
          </div>
        )}
      </div>

      {loading && (
        <p className="text-white/50 py-8 text-center">Updating cart…</p>
      )}

      {!loading &&
        groups.map((g) => (
          <section
            key={g.sellerId}
            className="rounded-xl border border-[rgba(161,130,65,0.25)] bg-mid-navy/80 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-gold">{g.sellerName}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    removeItems(g.lines.map((x) => x.listing.id));
                    toast.success("Removed seller group from cart");
                  }}
                  className="text-sm text-white/70 hover:text-white underline"
                >
                  Remove group
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutGroup(g)}
                  disabled={g.lines.some((x) => x.listing.isGstFree === null)}
                  className="text-sm bg-gold text-[#0d1b2a] px-4 py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Proceed to pay
                </button>
              </div>
            </div>
            <ul className="divide-y divide-white/10">
              {g.lines.map(({ listing: l, quantity: q }) => (
                <li key={l.id} className="flex gap-4 p-4">
                  <Link
                    href={`/listings/${l.id}`}
                    className="relative w-20 h-20 rounded-lg bg-white/5 shrink-0 overflow-hidden"
                  >
                    {l.images[0] ? (
                      <Image src={l.images[0]} alt="" fill className="object-cover" sizes="80px" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-white/30 text-xs">
                        Rx
                      </span>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/listings/${l.id}`}
                      className="font-medium text-white hover:text-gold line-clamp-2"
                    >
                      {l.productName}
                    </Link>
                    <p className="text-sm text-white/50 mt-1">
                      ${l.pricePerPack.toFixed(2)}/pack (ex GST), pack of {effectivePackSize(l.packSize ?? 1)}{" "}
                      · ${formatUnitPriceExGstDisplay(l.pricePerPack, l.packSize ?? 1)}/unit ·{" "}
                      {l.availableUnits} units avail.
                    </p>
                    <p className="text-sm text-gold/90 mt-0.5 font-medium">
                      This line: {q} units × ${formatUnitPriceExGstDisplay(l.pricePerPack, l.packSize ?? 1)} = $
                      {lineTotalExGstFromUnits(l.pricePerPack, l.packSize ?? 1, q).toFixed(2)} (ex GST)
                    </p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-sm text-white/60">Qty (units)</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="w-9 h-9 rounded border border-white/20 text-white hover:bg-white/10"
                          onClick={() =>
                            q <= 1 ? removeItem(l.id) : setQuantity(l.id, q - 1)
                          }
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-white font-medium">{q}</span>
                        <button
                          type="button"
                          className="w-9 h-9 rounded border border-white/20 text-white hover:bg-white/10 disabled:opacity-40"
                          aria-disabled={q >= l.availableUnits}
                          onClick={() => {
                            if (q >= l.availableUnits) {
                              toast.warning(
                                `Not available at this quantity. Seller has only ${l.availableUnits} unit${l.availableUnits !== 1 ? "s" : ""} listed.`
                              );
                              return;
                            }
                            setQuantity(l.id, q + 1);
                          }}
                        >
                          +
                        </button>
                      </div>
                      {effectivePackSize(l.packSize ?? 1) > 1 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white/40">|</span>
                          <span className="text-white/50">Pack</span>
                          <button
                            type="button"
                            className="px-2 py-1 rounded border border-white/20 text-white/90 hover:bg-white/10 disabled:opacity-30 text-xs"
                            disabled={q < effectivePackSize(l.packSize ?? 1)}
                            onClick={() => {
                              const ps = effectivePackSize(l.packSize ?? 1);
                              setQuantity(l.id, Math.max(1, q - ps));
                            }}
                            title="Remove one full pack"
                          >
                            −1 pack
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 rounded border border-white/20 text-white/90 hover:bg-white/10 disabled:opacity-30 text-xs"
                            aria-disabled={q + effectivePackSize(l.packSize ?? 1) > l.availableUnits}
                            onClick={() => {
                              const ps = effectivePackSize(l.packSize ?? 1);
                              if (q + ps > l.availableUnits) {
                                toast.warning(
                                  `Not available at this quantity. Adding ${ps} units would exceed the ${l.availableUnits} units listed.`
                                );
                                return;
                              }
                              setQuantity(l.id, q + ps);
                            }}
                            title="Add one full pack"
                          >
                            +1 pack
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          removeItem(l.id);
                          toast.success("Removed from cart");
                        }}
                        className="text-sm text-red-400 hover:text-red-300 ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                    {effectivePackSize(l.packSize ?? 1) > 1 && q >= effectivePackSize(l.packSize ?? 1) && (
                      <p className="text-xs text-white/40 mt-1">
                        Includes {Math.floor(q / effectivePackSize(l.packSize ?? 1))} full pack
                        {Math.floor(q / effectivePackSize(l.packSize ?? 1)) !== 1 ? "s" : ""} (
                        {q % effectivePackSize(l.packSize ?? 1) > 0
                          ? `${q % effectivePackSize(l.packSize ?? 1)} extra units`
                          : "exact packs only"}
                        )
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {checkoutGroup && (
        <BuyNowModal
          onClose={() => setCheckoutGroup(null)}
          cartLines={checkoutGroup.lines.map((line) => ({
            listing: previewToBuyListing(line.listing),
            quantity: line.quantity,
          }))}
        />
      )}
    </div>
  );
}
