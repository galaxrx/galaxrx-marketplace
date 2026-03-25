import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOrderShippingMeta, parseTrustedShipmentDocumentUrl } from "@/lib/order-shipping";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const user = session.user as { id: string; role?: string };
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }
  const isAdmin = user.role === "ADMIN";
  const isSeller = order.sellerId === user.id;
  if (!isAdmin && !isSeller) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const meta = parseOrderShippingMeta(order.sellerNotes);
  const labelUrl = meta.transdirect?.labelUrl;
  if (!labelUrl) {
    return NextResponse.json({ message: "Shipping label not available." }, { status: 404 });
  }
  const trustedLabelUrl = parseTrustedShipmentDocumentUrl(labelUrl);
  if (!trustedLabelUrl) {
    return NextResponse.json({ message: "Shipping label URL is invalid or untrusted." }, { status: 400 });
  }
  return NextResponse.redirect(trustedLabelUrl, { status: 302 });
}
