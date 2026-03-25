"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { getDeliveryOption } from "@/lib/deliveryOptions";
import { formatOrderQuantityLabel } from "@/lib/listing-units";
import {
  hasTransdirectBookedArtifacts,
  normalizeTransdirectShipmentState,
  parseOrderShippingMeta,
  normalizeTransdirectTrackingStatus,
} from "@/lib/order-shipping";

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-400",
  PAID: "bg-blue-500/20 text-blue-300",
  SHIPPED: "bg-amber-500/20 text-amber-400",
  DELIVERED: "bg-success/20 text-success",
  DISPUTED: "bg-error/20 text-error",
  CANCELLED: "bg-white/10 text-white/60",
  REFUNDED: "bg-purple-500/20 text-purple-300",
  REFUNDED_PARTIAL: "bg-purple-500/20 text-purple-300",
  REFUNDED_FULL: "bg-purple-500/20 text-purple-300",
  DISPUTE_LOST: "bg-error/20 text-error",
};

/** Buyer can rate seller after successful payment. */
const BUYER_CAN_RATE_STATUSES = new Set(["PAID", "SHIPPED", "DELIVERED"]);

type Order = {
  id: string;
  listingId: string | null;
  wantedOfferId?: string | null;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  deliveryFee?: number;
  platformFee: number;
  gstAmount: number;
  netAmount: number;
  status: string;
  fulfillmentType: string;
  trackingNumber: string | null;
  courierName: string | null;
  sellerNotes?: string | null;
  createdAt: string;
  listing: { productName: string; strength: string | null; packSize?: number } | null;
  wantedOffer?: { wantedItem: { productName: string; strength: string | null } } | null;
  buyer: { id: string; name: string; isVerified: boolean };
  seller: { id: string; name: string; isVerified: boolean };
  reviews?: { id: string; reviewerId: string; subjectId: string }[];
};

type Props = {
  order: Order;
  viewAs: "buyer" | "seller";
};

export default function OrderCard({ order, viewAs }: Props) {
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [courier, setCourier] = useState(order.courierName ?? "");
  const [savingTracking, setSavingTracking] = useState(false);
  const [deliveredLoading, setDeliveredLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [trackingRefreshLoading, setTrackingRefreshLoading] = useState(false);
  const [bookingApprovalLoading, setBookingApprovalLoading] = useState(false);

  const otherParty = viewAs === "buyer" ? order.seller : order.buyer;
  const threadId = order.listingId
    ? `listing_${order.listingId}_${order.buyer.id}_${order.seller.id}`
    : order.wantedOfferId
      ? `wanted_${order.wantedOfferId}_${order.buyer.id}_${order.seller.id}`
      : null;
  const productName = order.listing?.productName ?? order.wantedOffer?.wantedItem?.productName ?? "Product";
  const productSub = order.listing?.strength ?? order.wantedOffer?.wantedItem?.strength;
  const statusStyle = STATUS_STYLES[order.status] ?? "bg-white/10 text-white/80";
  const shippingMeta = parseOrderShippingMeta(order.sellerNotes ?? null);
  const transdirectMeta = shippingMeta?.transdirect;
  const isDirectShipmentArrangement = shippingMeta?.shippingArrangement === "direct_contact";

  async function saveTracking() {
    setSavingTracking(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SHIPPED",
          trackingNumber: tracking || undefined,
          courierName: courier || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "Failed to update");
        setSavingTracking(false);
        return;
      }
      toast.success("Tracking saved. Buyer will be notified.");
      setSavingTracking(false);
      window.location.reload();
    } catch {
      toast.error("Something went wrong");
      setSavingTracking(false);
    }
  }

  async function markDelivered() {
    if (!confirm("Confirm you have received this order?")) return;
    setDeliveredLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "Failed to update");
        setDeliveredLoading(false);
        return;
      }
      toast.success("Marked as delivered.");
      setDeliveredLoading(false);
      window.location.reload();
    } catch {
      toast.error("Something went wrong");
      setDeliveredLoading(false);
    }
  }

  async function submitReview() {
    if (reviewRating < 1 || reviewRating > 5) {
      toast.error("Please select a rating");
      return;
    }
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          rating: reviewRating,
          comment: reviewComment || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message ?? "Failed to submit review");
        setReviewSubmitting(false);
        return;
      }
      toast.success("Review submitted.");
      setShowReviewModal(false);
      setReviewSubmitting(false);
      window.location.reload();
    } catch {
      toast.error("Something went wrong");
      setReviewSubmitting(false);
    }
  }

  async function refreshTracking() {
    setTrackingRefreshLoading(true);
    try {
      const res = await fetch(`/api/transdirect/tracking?orderId=${encodeURIComponent(order.id)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to refresh tracking");
        setTrackingRefreshLoading(false);
        return;
      }
      toast.success("Tracking refreshed.");
      window.location.reload();
    } catch {
      toast.error("Failed to refresh tracking");
    } finally {
      setTrackingRefreshLoading(false);
    }
  }

  async function approveAndBookCourier() {
    setBookingApprovalLoading(true);
    try {
      const res = await fetch("/api/transdirect/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Failed to book shipment");
        setBookingApprovalLoading(false);
        return;
      }
      toast.success("Shipment approved and courier booking started.");
      window.location.reload();
    } catch {
      toast.error("Failed to book shipment");
    } finally {
      setBookingApprovalLoading(false);
    }
  }

  const isSeller = viewAs === "seller";
  const buyerRatedSeller = order.reviews?.some((r) => r.reviewerId === order.buyer.id);
  const canEnterTracking = isSeller && order.status === "PAID";
  const canMarkDelivered = !isSeller && order.status === "SHIPPED";
  const canRateSeller =
    !isSeller && BUYER_CAN_RATE_STATUSES.has(order.status) && !buyerRatedSeller;
  const normalizedShipmentState = normalizeTransdirectShipmentState(transdirectMeta);
  const hasBookedArtifact = hasTransdirectBookedArtifacts(transdirectMeta);
  const isBookedLikeState =
    normalizedShipmentState === "booked" ||
    normalizedShipmentState === "in_transit" ||
    normalizedShipmentState === "delivered";
  const isBookingInProgress = normalizedShipmentState === "booking_in_progress";
  const needsSellerApprovalForBooking =
    isSeller &&
    order.status === "PAID" &&
    Boolean(transdirectMeta) &&
    normalizedShipmentState === "ready_to_book" &&
    !isBookingInProgress &&
    !isBookedLikeState &&
    !hasBookedArtifact;
  const shipDeadlineLabel = (() => {
    const d = new Date(new Date(order.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-AU") : "";
  })();
  const pickupDateValue = transdirectMeta?.pickupDate
    ? String(transdirectMeta.pickupDate).slice(0, 10)
    : "";
  const shipmentStateLabel = (() => {
    switch (normalizedShipmentState) {
      case "booking_in_progress":
        return "booking in progress";
      case "ready_to_book":
        return "ready to book";
      case "in_transit":
        return "in transit";
      case "out_for_delivery":
        return "out for delivery";
      case "delivered":
        return "delivered";
      case "cancelled":
        return "cancelled";
      case "returned":
        return "returned";
      case "exception":
        return "delivery exception";
      case "failed":
        return "failed";
      case "booked":
        return "booked";
      default:
        return normalizedShipmentState ? normalizedShipmentState.replace(/_/g, " ") : "awaiting seller approval";
    }
  })();
  const latestTrackingLabel = transdirectMeta?.lastTrackingStatusRaw
    ? normalizeTransdirectTrackingStatus(transdirectMeta.lastTrackingStatusRaw).replace(/_/g, " ")
    : transdirectMeta?.lastTrackingStatus
      ? normalizeTransdirectTrackingStatus(transdirectMeta.lastTrackingStatus).replace(/_/g, " ")
      : "";
  const showAttentionState = normalizedShipmentState === "exception" || normalizedShipmentState === "returned" || normalizedShipmentState === "cancelled" || Boolean(transdirectMeta?.needsAttention);

  const inputClass = "bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-gold flex-1 min-w-[10rem] max-w-xs";

  return (
    <div
      id={`order-${order.id}`}
      className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-4 md:p-6 space-y-3 scroll-mt-24"
    >
      <div className="flex flex-wrap justify-between items-start gap-2">
        <p className="font-semibold text-white">
          Order #GX-{order.id.slice(-5).toUpperCase()} · {format(new Date(order.createdAt), "d MMM yyyy")}
        </p>
        <span className={`text-xs px-2 py-1 rounded font-medium ${statusStyle}`}>
          {order.status}
        </span>
      </div>
      <p className="text-white/90">
        {productName}
        {productSub && ` · ${productSub}`} ·{" "}
        {formatOrderQuantityLabel(order.listing?.packSize, order.quantity)}
      </p>
      <p className="text-sm text-white/70">
        {viewAs === "buyer" ? "Seller" : "Buyer"}: {otherParty.name}
        {otherParty.isVerified && " ✓"}
      </p>
      {isDirectShipmentArrangement && (
        <p className="text-xs text-amber-300">
          Shipment arrangement: Buyer and seller will organise freight directly.
        </p>
      )}
      <p className="text-sm text-white/70">
        ${order.grossAmount.toFixed(2)} ex GST
        {(order.deliveryFee ?? 0) > 0 && ` · Delivery $${(order.deliveryFee ?? 0).toFixed(2)}`}
        {" "}· GST ${order.gstAmount.toFixed(2)} · Total ${(order.grossAmount + (order.deliveryFee ?? 0) + order.gstAmount).toFixed(2)}
      </p>
      {isSeller && (
        <p className="text-sm text-white/70">
          Platform fee: ${order.platformFee.toFixed(2)} · You receive: ${order.netAmount.toFixed(2)}
        </p>
      )}
      <p className="text-sm text-white/70">Delivery: {getDeliveryOption(order.fulfillmentType).label}</p>
      {order.trackingNumber && (
        <p className="text-sm text-white/80">Tracking: {order.trackingNumber} {order.courierName && `(${order.courierName})`}</p>
      )}
      {transdirectMeta && (
        <p className={`text-sm ${showAttentionState ? "text-amber-300" : "text-white/70"}`}>
          Shipment status: {shipmentStateLabel}
        </p>
      )}
      {isSeller && order.status === "PAID" && transdirectMeta && (
        <div className="border-t border-[rgba(161,130,65,0.2)] pt-3 space-y-2">
          <p className="text-sm font-medium text-white/80">Shipping details</p>
          <p className="text-xs text-white/60">
            Must ship within 3 days. Deadline: <span className="text-white/75">{shipDeadlineLabel}</span>
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={pickupDateValue}
              onChange={async (e) => {
                const v = e.target.value;
                if (!v) return;
                const res = await fetch(`/api/orders/${order.id}/shipping`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    pickupDate: new Date(v).toISOString(),
                    selectedCourierName: transdirectMeta.selectedCourierName,
                    selectedServiceName: transdirectMeta.selectedServiceName,
                  }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  toast.error(data.message ?? "Failed to save shipping date");
                  return;
                }
                toast.success("Shipping date saved. Buyer notified.");
                window.location.reload();
              }}
              className={inputClass + " max-w-[12rem]"}
            />
            <span className="text-xs text-white/55">
              Set pickup/shipping date before booking courier.
            </span>
          </div>
        </div>
      )}
      {latestTrackingLabel && (
        <p className={`text-sm ${showAttentionState ? "text-amber-300" : "text-white/70"}`}>
          Latest tracking: {latestTrackingLabel}
        </p>
      )}
      {isSeller && transdirectMeta?.labelUrl && (
        <p className="text-sm">
          <a href={`/api/orders/${order.id}/shipping-label`} target="_blank" rel="noreferrer" className="text-gold hover:underline">
            Open shipping label
          </a>
        </p>
      )}

      {canEnterTracking && (
        <div className="border-t border-[rgba(161,130,65,0.2)] pt-3 space-y-2">
          <label className="block text-sm font-medium text-white/80">Tracking</label>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Tracking number"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Carrier"
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className={inputClass + " min-w-[8rem] max-w-[10rem] flex-1"}
            />
            <button
              type="button"
              onClick={saveTracking}
              disabled={savingTracking}
              className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50"
            >
              {savingTracking ? "Saving…" : "Save & Notify Buyer"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {threadId && (
          <Link
            href={`/messages/${threadId}`}
            className="text-sm text-gold hover:underline"
          >
            Message {viewAs === "buyer" ? "Seller" : "Buyer"}
          </Link>
        )}
        {needsSellerApprovalForBooking && (
          <button
            type="button"
            onClick={approveAndBookCourier}
            disabled={bookingApprovalLoading || !transdirectMeta?.pickupDate}
            className="text-sm bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-3 py-1.5 rounded-lg font-bold hover:opacity-90 disabled:opacity-50"
          >
            {bookingApprovalLoading ? "Approving…" : "Approve & Book Courier"}
          </button>
        )}
        {transdirectMeta && (
          <button
            type="button"
            onClick={refreshTracking}
            disabled={trackingRefreshLoading}
            className="text-sm border border-[rgba(161,130,65,0.35)] text-white/85 px-3 py-1.5 rounded hover:bg-white/5 disabled:opacity-50"
          >
            {trackingRefreshLoading ? "Refreshing…" : "Refresh tracking"}
          </button>
        )}
        {canMarkDelivered && (
          <button
            type="button"
            onClick={markDelivered}
            disabled={deliveredLoading}
            className="text-sm bg-success text-white px-3 py-1.5 rounded hover:bg-success/90 disabled:opacity-50"
          >
            {deliveredLoading ? "…" : "✓ Mark as Delivered"}
          </button>
        )}
        {canRateSeller && (
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="text-sm bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-3 py-1.5 rounded-lg font-bold hover:opacity-90"
          >
            ⭐ Rate the seller
          </button>
        )}
        {!isSeller && buyerRatedSeller && (
          <span className="text-sm text-success">You rated this seller ✓</span>
        )}
        {isSeller && buyerRatedSeller && (
          <span className="text-sm text-white/60">Buyer left a rating ✓</span>
        )}
      </div>

      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-mid-navy border border-[rgba(161,130,65,0.25)] rounded-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-lg text-white mb-2">Rate {otherParty.name}</h3>
            <p className="text-xs text-white/55 mb-3">
              Your rating is shown on this seller&apos;s listings. One rating per order.
            </p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="text-2xl text-gold hover:opacity-80"
                >
                  {star <= reviewRating ? "★" : "☆"}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Optional comment..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full bg-white/5 border border-[rgba(161,130,65,0.25)] rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 mb-4 min-h-[80px] focus:ring-2 focus:ring-gold"
              maxLength={500}
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 border border-[rgba(161,130,65,0.4)] text-white/80 rounded-lg hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReview}
                disabled={reviewSubmitting || reviewRating < 1}
                className="px-4 py-2 bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] rounded-lg font-bold hover:opacity-90 disabled:opacity-50"
              >
                {reviewSubmitting ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
