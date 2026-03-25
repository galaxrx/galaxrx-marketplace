import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mergeOrderShippingMeta, parseOrderShippingMeta } from "@/lib/order-shipping";
import { sendShippingScheduled } from "@/lib/resend";
import { z } from "zod";

const schema = z.object({
  pickupDate: z.string().min(1),
  selectedCourierName: z.string().optional(),
  selectedServiceName: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { buyer: { select: { email: true, notifyOrderShipped: true } } },
  });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  const userId = (session.user as { id: string }).id;
  if (order.sellerId !== userId) {
    return NextResponse.json({ message: "Only seller can update shipping details" }, { status: 403 });
  }
  if (order.status !== "PAID") {
    return NextResponse.json({ message: "Order must be PAID to update shipping details" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid pickup date" }, { status: 400 });
  }
  const pickupMs = new Date(parsed.data.pickupDate).getTime();
  if (!Number.isFinite(pickupMs)) {
    return NextResponse.json({ message: "Pickup date is invalid" }, { status: 400 });
  }
  const created = new Date(order.createdAt).getTime();
  const deadline = created + 3 * 24 * 60 * 60 * 1000;
  if (pickupMs > deadline) {
    return NextResponse.json(
      { message: "Pickup/shipping date must be within 3 days of purchase." },
      { status: 400 }
    );
  }

  const existing = parseOrderShippingMeta(order.sellerNotes);
  const updated = await prisma.order.update({
    where: { id },
    data: {
      sellerNotes: mergeOrderShippingMeta(order.sellerNotes, {
        transdirect: {
          provider: "transdirect",
          pickupDate: parsed.data.pickupDate,
          selectedCourierName: parsed.data.selectedCourierName ?? existing.transdirect?.selectedCourierName,
          selectedServiceName: parsed.data.selectedServiceName ?? existing.transdirect?.selectedServiceName,
          bookingStatus: existing.transdirect?.bookingReference
            ? existing.transdirect?.bookingStatus
            : "ready_to_book",
          shipmentState: existing.transdirect?.bookingReference
            ? existing.transdirect?.shipmentState
            : "ready_to_book",
          bookingStartedAt: existing.transdirect?.bookingReference
            ? existing.transdirect?.bookingStartedAt
            : undefined,
        },
      }),
    },
  });

  // Notify buyer when shipping date is set (uses notifyOrderShipped preference as closest existing toggle).
  if (order.buyer.email && order.buyer.notifyOrderShipped) {
    await sendShippingScheduled(
      order.buyer.email,
      `GX-${order.id.slice(-5).toUpperCase()}`,
      parsed.data.pickupDate
    );
  }

  return NextResponse.json(updated);
}

