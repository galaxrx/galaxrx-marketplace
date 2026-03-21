import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  orderId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const reviewerId = (session.user as { id: string }).id;
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { orderId, rating, comment } = parsed.data;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }
    /** Buyer rates the seller after payment (fulfillment may still be in progress). */
    const RATEABLE_STATUSES = ["PAID", "SHIPPED", "DELIVERED"] as const;
    if (!RATEABLE_STATUSES.includes(order.status as (typeof RATEABLE_STATUSES)[number])) {
      return NextResponse.json(
        {
          message:
            "You can rate the seller once the order is paid. If the order was cancelled or refunded, it cannot be rated.",
        },
        { status: 400 }
      );
    }
    if (order.buyerId !== reviewerId) {
      return NextResponse.json(
        { message: "Only the buyer can rate the seller for this order" },
        { status: 403 }
      );
    }
    const subjectId = order.sellerId;
    const existing = await prisma.review.findUnique({
      where: { orderId_reviewerId: { orderId, reviewerId } },
    });
    if (existing) {
      return NextResponse.json(
        { message: "You have already reviewed this order" },
        { status: 400 }
      );
    }
    const review = await prisma.review.create({
      data: {
        orderId,
        reviewerId,
        subjectId,
        rating,
        comment: comment ?? null,
      },
    });
    const reviews = await prisma.review.findMany({
      where: { subjectId },
    });
    const avg =
      reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await prisma.pharmacy.update({
      where: { id: subjectId },
      data: { rating: avg, reviewCount: reviews.length },
    });
    return NextResponse.json(review);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to create review" },
      { status: 500 }
    );
  }
}
