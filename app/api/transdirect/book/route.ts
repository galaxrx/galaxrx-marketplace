import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bookTransdirectForOrder } from "@/lib/transdirect-order";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  orderId: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const user = session.user as { id: string; role?: string };
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "orderId is required." }, { status: 400 });
  const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
  if (!order) return NextResponse.json({ message: "Order not found." }, { status: 404 });
  const canBook = user.role === "ADMIN" || order.sellerId === user.id;
  if (!canBook) return NextResponse.json({ message: "Only the seller can book shipment." }, { status: 403 });
  const result = await bookTransdirectForOrder(order.id);
  if (!result.ok) {
    const status =
      result.code === "ORDER_NOT_FOUND"
        ? 404
        : result.code === "ORDER_NOT_PAID" ||
            result.code === "PROVIDER_NOT_TRANSDIRECT" ||
            result.code === "STATE_NOT_READY" ||
            result.code === "PICKUP_DATE_REQUIRED" ||
            result.code === "PICKUP_DATE_INVALID" ||
            result.code === "PICKUP_DATE_OUTSIDE_WINDOW"
          ? 400
          : 502;
    return NextResponse.json({ message: result.message, code: result.code }, { status });
  }
  return NextResponse.json(result);
}
