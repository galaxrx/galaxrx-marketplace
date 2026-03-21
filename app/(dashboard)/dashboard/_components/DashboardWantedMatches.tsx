import { prisma } from "@/lib/prisma";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";
import Link from "next/link";
import WantedMatchesGrid from "@/app/(dashboard)/wanted-matches/_components/WantedMatchesGrid";

export default async function DashboardWantedMatches({
  pharmacyId,
}: {
  pharmacyId: string;
}) {
  const messages = await prisma.message.findMany({
    where: {
      recipientId: pharmacyId,
      listing: { is: listingBuyableByOthersWhere() },
    },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: {
          pharmacy: {
            select: {
              id: true,
              name: true,
              rating: true,
              reviewCount: true,
              tradeCount: true,
              isVerified: true,
            },
          },
        },
      },
    },
  });

  const seen = new Set<string>();
  const matches: Array<{
    listing: NonNullable<(typeof messages)[0]["listing"]>;
    notifiedAt: Date;
  }> = [];
  for (const m of messages) {
    if (!m.listing || seen.has(m.listing.id)) continue;
    seen.add(m.listing.id);
    const availableUnits = Math.max(0, m.listing.quantityUnits - m.listing.reservedUnits);
    matches.push({
      listing: { ...m.listing, availableUnits },
      notifiedAt: m.createdAt,
    });
  }

  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-heading font-semibold text-lg text-white inline-flex items-center gap-1.5">
          Wanted matches
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-white/90 text-xs cursor-help"
            title="Listings that match items you wanted. When someone lists a product you asked for, it appears here."
          >
            ?
          </span>
        </h2>
        {matches.length > 0 && (
          <Link
            href="/wanted-matches"
            className="text-sm text-gold hover:underline font-medium"
          >
            View all →
          </Link>
        )}
      </div>
      {matches.length === 0 ? (
        <p className="text-white/60 text-sm">
          No matching listings yet. When someone lists a product you wanted,
          you’ll see it here and get a message.
        </p>
      ) : (
        <WantedMatchesGrid
          matches={matches.slice(0, 3)}
        />
      )}
    </div>
  );
}
