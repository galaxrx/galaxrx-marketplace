import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { OrderStatus } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["SHIPPED", "DELIVERED"]),
  trackingNumber: z.string().optional(),
  courierName: z.string().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid status or trackingNumber" },
      { status: 400 }
    );
  }
  const { status, trackingNumber, courierName } = parsed.data;

  if (status === "SHIPPED") {
    if (order.sellerId !== pharmacyId) {
      return NextResponse.json({ message: "Only seller can mark as shipped" }, { status: 403 });
    }
    if (order.status !== "PAID") {
      return NextResponse.json({ message: "Order must be PAID before marking shipped" }, { status: 400 });
    }
  } else if (status === "DELIVERED") {
    if (order.buyerId !== pharmacyId) {
      return NextResponse.json({ message: "Only buyer can mark as delivered" }, { status: 403 });
    }
    if (order.status !== "SHIPPED") {
      return NextResponse.json({ message: "Order must be SHIPPED before marking delivered" }, { status: 400 });
    }
  }

  const updateData: { status: OrderStatus; trackingNumber?: string; courierName?: string } = { status: status as OrderStatus };
  if (trackingNumber != null) updateData.trackingNumber = trackingNumber;
  if (courierName != null) updateData.courierName = courierName;

  const updated = await prisma.order.update({
    where: { id },
    data: updateData,
  });

  // Send "order shipped" email to buyer when status becomes SHIPPED
  if (status === "SHIPPED") {
    const { sendOrderShipped } = await import("@/lib/resend");
    const buyer = await prisma.pharmacy.findUnique({
      where: { id: order.buyerId },
      select: { email: true, notifyOrderShipped: true },
    });
    if (buyer?.email && buyer.notifyOrderShipped) {
      await sendOrderShipped(
        buyer.email,
        `GX-${order.id.slice(-5).toUpperCase()}`,
        updated.trackingNumber ?? ""
      );
    }
  }

  return NextResponse.json(updated);
}
