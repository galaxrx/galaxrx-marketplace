import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTransdirectTracking, normalizeTransdirectError } from "@/lib/transdirect";
import { refreshTransdirectTrackingForOrder } from "@/lib/transdirect-order";
import { parseOrderShippingMeta } from "@/lib/order-shipping";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId") ?? "";
  const bookingReference = searchParams.get("bookingReference") ?? undefined;
  const consignmentNumber = searchParams.get("consignmentNumber") ?? undefined;
  const trackingNumber = searchParams.get("trackingNumber") ?? undefined;

  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ message: "Order not found." }, { status: 404 });
    if (order.buyerId !== (session.user as { id: string }).id && order.sellerId !== (session.user as { id: string }).id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const refreshed = await refreshTransdirectTrackingForOrder(orderId);
    if (!refreshed.ok) return NextResponse.json({ message: refreshed.message }, { status: 502 });
    const updated = await prisma.order.findUnique({ where: { id: orderId } });
    const meta = parseOrderShippingMeta(updated?.sellerNotes ?? null);
    return NextResponse.json({
      provider: "transdirect",
      status: meta.transdirect?.lastTrackingStatus ?? "unknown",
      raw: meta.transdirect?.rawTracking,
    });
  }

  if (!bookingReference && !consignmentNumber && !trackingNumber) {
    return NextResponse.json(
      { message: "Provide orderId or at least one tracking reference." },
      { status: 400 }
    );
  }
  try {
    const data = await getTransdirectTracking({ bookingReference, consignmentNumber, trackingNumber });
    return NextResponse.json(data);
  } catch (error) {
    const normalized = normalizeTransdirectError(error);
    return NextResponse.json({ message: normalized.message, code: normalized.code }, { status: 502 });
  }
}
