import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listingBuyableByOthersWhere } from "@/lib/listing-buyable";
import Link from "next/link";
import WantedMatchesGrid from "./_components/WantedMatchesGrid";

export default async function WantedMatchesPage() {
  const session = await getServerSession(authOptions);
  const pharmacyId = (session?.user as { id?: string })?.id;
  if (!pharmacyId) redirect("/login");

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
            select: { id: true, name: true, rating: true, reviewCount: true, tradeCount: true, isVerified: true },
          },
        },
      },
    },
  });

  const seen = new Set<string>();
  const matches: Array<{ listing: NonNullable<(typeof messages)[0]["listing"]>; notifiedAt: Date }> = [];
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-gold inline-flex items-center gap-2">
          Wanted matches
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white/90 text-sm cursor-help"
            title="Listings that match items you wanted. When someone lists a product you asked for, it appears here."
          >
            ?
          </span>
        </h1>
        <Link
          href="/dashboard"
          className="text-sm text-white/80 hover:text-gold transition"
        >
          ← Dashboard
        </Link>
      </div>
      <WantedMatchesGrid matches={matches} />
    </div>
  );
}
