import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservationsForListingIds } from "@/lib/listing-reservation";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { differenceInDays } from "date-fns";
import ListingDetailView from "@/components/listings/ListingDetailView";
import { activeAcceptedListingNegotiationWhere } from "@/lib/listing-negotiation-hold";
import { getPendingListingIdSet } from "@/lib/listing-pending";

type ListingDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { id } = await params;
  await releaseExpiredReservationsForListingIds([id]);
  const session = await getServerSession(authOptions);
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      pharmacy: {
        select: {
          id: true,
          name: true,
          suburb: true,
          state: true,
          postcode: true,
          phone: true,
          approvalNumber: true,
          rating: true,
          reviewCount: true,
          tradeCount: true,
          createdAt: true,
          isVerified: true,
          stripeAccountId: true,
        },
      },
      drugMaster: { select: { pbsCode: true } },
    },
  });
  if (!listing) notFound();

  const isOwner =
    session?.user != null &&
    (session.user as { id: string }).id === listing.pharmacyId;
  const viewerId = session?.user ? (session.user as { id: string }).id : null;
  let hasActiveCheckoutHold = false;
  if (viewerId && !isOwner) {
    const hold = await prisma.paymentAttempt.findFirst({
      where: {
        buyerId: viewerId,
        listingId: id,
        reservationStatus: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    hasActiveCheckoutHold = Boolean(hold);
  }
  if (!isOwner && !hasActiveCheckoutHold) {
    if (!listing.isActive || listing.quantityUnits <= listing.reservedUnits) {
      return (
        <div className="min-h-screen bg-[#0D1B2A] flex flex-col items-center justify-center px-6 py-20">
          <span className="text-5xl mb-4" aria-hidden>
            📦
          </span>
          <h1 className="text-2xl font-heading font-bold text-white mb-2 text-center">
            This listing is no longer available
          </h1>
          <p className="text-white/65 text-center max-w-md mb-8">
            It may have sold out, or all remaining stock is currently held in another checkout.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/buy"
              className="inline-flex items-center justify-center bg-gold text-[#0d1b2a] px-6 py-3 rounded-lg font-semibold hover:opacity-90"
            >
              Buy Stock
            </Link>
            <Link
              href="/listings"
              className="inline-flex items-center justify-center border border-gold/60 text-gold px-6 py-3 rounded-lg font-semibold hover:bg-gold/10"
            >
              Browse marketplace
            </Link>
          </div>
        </div>
      );
    }
  }

  await prisma.listing.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  const stateLabel = listing.stateRestriction
    ? `${listing.stateRestriction} only`
    : "Available Australia-wide";

  const sellerReviews = await prisma.review.findMany({
    where: { subjectId: listing.pharmacyId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { reviewer: { select: { name: true } } },
  });

  const related = await prisma.listing.findMany({
    where: {
      id: { not: id },
      category: listing.category,
      productName: { contains: listing.productName.split(" ")[0] ?? "", mode: "insensitive" },
      ...listingBuyableByOthersWhere(),
    },
    take: 4,
    include: {
      pharmacy: { select: { name: true, rating: true, reviewCount: true, tradeCount: true, isVerified: true } },
    },
  });

  const pendingIds = await getPendingListingIdSet([
    {
      id,
      quantityUnits: listing.quantityUnits,
      reservedUnits: listing.reservedUnits,
    },
  ]);
  const isPending = pendingIds.has(id);

  let acceptedPricePerPack: number | undefined;
  if (session?.user && (session.user as { id: string }).id !== listing.pharmacyId) {
    const accepted = await prisma.listingNegotiation.findFirst({
      where: {
        listingId: id,
        buyerId: (session.user as { id: string }).id,
        ...activeAcceptedListingNegotiationWhere(),
      },
      orderBy: { updatedAt: "desc" },
      select: { proposedPricePerPack: true },
    });
    if (accepted) acceptedPricePerPack = accepted.proposedPricePerPack;
  }

  const baseAvailable = Math.max(0, listing.quantityUnits - listing.reservedUnits);
  let availableUnits = baseAvailable;
  if (viewerId && viewerId !== listing.pharmacyId) {
    const myCheckoutHold = await prisma.paymentAttempt.findFirst({
      where: {
        buyerId: viewerId,
        listingId: id,
        reservationStatus: "ACTIVE",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: { quantity: true },
    });
    if (myCheckoutHold) {
      availableUnits = Math.max(baseAvailable, myCheckoutHold.quantity);
    }
  }
  const listingForPriceBox = {
    ...listing,
    availableUnits,
    pharmacy: {
      ...listing.pharmacy,
      createdAt: listing.pharmacy.createdAt.toISOString(),
    },
  };

  const sessionProp = session
    ? { user: { id: (session.user as { id: string }).id, isVerified: (session.user as { isVerified?: boolean }).isVerified } }
    : null;

  const listingForView = { ...listing, availableUnits };

  return (
    <ListingDetailView
      listing={listingForView}
      session={sessionProp}
      sellerReviews={sellerReviews}
      related={related}
      listingForPriceBox={listingForPriceBox}
      acceptedPricePerPack={acceptedPricePerPack}
      stateLabel={stateLabel}
      id={id}
      isPending={isPending}
    />
  );
}
