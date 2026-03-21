import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WantedItemForm from "@/components/wanted/WantedItemForm";
import WantedItemRow from "@/components/wanted/WantedItemRow";
import MatchingListingsTooltip from "@/components/wanted/MatchingListingsTooltip";

export const dynamic = "force-dynamic";

export default async function WantedPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const currentUserId = (session.user as { id: string }).id;

  const items = await prisma.wantedItem.findMany({
    where: {
      pharmacyId: currentUserId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { pharmacy: { select: { id: true, name: true, isVerified: true, state: true } } },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <aside className="lg:col-span-4 xl:col-span-4 order-2 lg:order-1">
        <h2 className="text-xl font-heading font-bold text-gold mb-4">Post wanted request</h2>
        <WantedItemForm />
      </aside>
      <section className="lg:col-span-8 xl:col-span-8 order-1 lg:order-2">
        <h1 className="text-2xl font-heading font-bold text-gold mb-6 inline-flex items-center gap-2">
          My wanted items
          <MatchingListingsTooltip />
        </h1>
        {items.length === 0 ? (
          <p className="text-white/60">You have no active wanted requests. Post one using the form on the left.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((w) => (
              <WantedItemRow
                key={w.id}
                item={{
                  id: w.id,
                  productName: w.productName,
                  strength: w.strength,
                  barcode: w.barcode,
                  imageUrl: w.imageUrl,
                  quantity: w.quantity,
                  maxPrice: w.maxPrice,
                  urgency: w.urgency,
                  isSOS: w.isSOS ?? false,
                  notes: w.notes,
                  expiresAt: w.expiresAt,
                  pharmacy: w.pharmacy,
                }}
                isOwner={w.pharmacyId === currentUserId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
