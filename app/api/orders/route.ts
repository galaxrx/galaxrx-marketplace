import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePlatformFee, GST_RATE } from "@/lib/stripe";
import { unitPriceExGstFromPackPrice } from "@/lib/listing-units";
import { revalidateMarketplaceAfterPurchase } from "@/lib/revalidate-marketplace";

const orderInclude = {
  listing: { select: { productName: true, strength: true, packSize: true } },
  wantedOffer: { include: { wantedItem: { select: { productName: true, strength: true } } } },
  buyer: { select: { id: true, name: true, isVerified: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
  seller: { select: { id: true, name: true, isVerified: true, address: true, suburb: true, state: true, postcode: true, abn: true } },
  reviews: { select: { id: true, reviewerId: true, subjectId: true } },
} as const;

const ORDERS_ALL_CACHE_MS = 8_000;
const ordersAllCache = new Map<string, { data: { purchases: unknown[]; sales: unknown[] }; until: number }>();

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "purchases"; // purchases | sales | all

  if (type === "all") {
    const now = Date.now();
    const hit = ordersAllCache.get(pharmacyId);
    if (hit && hit.until > now) {
      return NextResponse.json(hit.data);
    }
    const [purchases, sales] = await Promise.all([
      prisma.order.findMany({
        where: { buyerId: pharmacyId },
        orderBy: { createdAt: "desc" },
        include: orderInclude,
      }),
      prisma.order.findMany({
        where: { sellerId: pharmacyId },
        orderBy: { createdAt: "desc" },
        include: orderInclude,
      }),
    ]);
    const data = { purchases, sales };
    ordersAllCache.set(pharmacyId, { data, until: now + ORDERS_ALL_CACHE_MS });
    return NextResponse.json(data);
  }

  const where = type === "sales" ? { sellerId: pharmacyId } : { buyerId: pharmacyId };
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });
  return NextResponse.json(orders);
}

/**
 * Manual order creation: ADMIN only.
 * Creates an order with source=MANUAL (no Stripe charge). Use for internal/offline orders only.
 * Not for normal checkout — normal checkout uses Stripe create-payment-intent + webhook.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json(
      { message: "Only administrators can create manual orders. Use checkout for Stripe-paid orders." },
      { status: 403 }
    );
  }
  try {
    const body = await req.json();
    const { listingId, quantity, buyerId, deliveryFee } = body as {
      listingId: string;
      quantity: number;
      buyerId: string;
      deliveryFee?: number;
    };
    if (!listingId || !quantity || quantity < 1 || !buyerId) {
      return NextResponse.json(
        { message: "listingId, quantity, and buyerId required" },
        { status: 400 }
      );
    }
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { pharmacy: true },
    });
    if (!listing || !listing.isActive) {
      return NextResponse.json(
        { message: "Listing not found or inactive" },
        { status: 404 }
      );
    }
    const available = listing.quantityUnits - listing.reservedUnits;
    if (available < quantity) {
      return NextResponse.json(
        { message: "Insufficient quantity" },
        { status: 400 }
      );
    }
    const deliveryFeeExGst = typeof deliveryFee === "number" && deliveryFee >= 0 ? deliveryFee : 0;
    const unitPrice = unitPriceExGstFromPackPrice(listing.pricePerPack, listing.packSize);
    const grossAmount = unitPrice * quantity;
    const platformFee = calculatePlatformFee(grossAmount);
    const gstAmount = (grossAmount + deliveryFeeExGst) * GST_RATE;
    const netAmount = grossAmount - platformFee + deliveryFeeExGst;

    const order = await prisma.order.create({
      data: {
        listingId,
        buyerId,
        sellerId: listing.pharmacyId,
        quantity,
        unitPrice,
        grossAmount,
        deliveryFee: deliveryFeeExGst,
        platformFee,
        gstAmount,
        netAmount,
        stripePaymentId: null,
        source: "MANUAL",
        status: "PAID",
        fulfillmentType: listing.fulfillmentType,
      },
    });
    const newQty = listing.quantityUnits - quantity;
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        quantityUnits: newQty,
        isActive: newQty > 0,
      },
    });
    if (newQty === 0) {
      await prisma.listingNegotiation.updateMany({
        where: { listingId, status: { in: ["PENDING", "ACCEPTED"] } },
        data: { status: "REJECTED" },
      });
    }
    revalidateMarketplaceAfterPurchase();
    return NextResponse.json(order);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to create order" },
      { status: 500 }
    );
  }
}
