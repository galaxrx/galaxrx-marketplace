import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WantedMatchesContent from "@/components/wanted/WantedMatchesContent";
export const dynamic = "force-dynamic";

export default async function WantedMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    search?: string;
    category?: string;
    state?: string;
    expiry?: string;
    condition?: string;
    fulfillment?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    lat?: string;
    lng?: string;
    page?: string;
  }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const wantedItem = await prisma.wantedItem.findUnique({
    where: { id },
    include: { pharmacy: { select: { id: true, name: true } } },
  });

  if (!wantedItem || wantedItem.pharmacyId !== (session.user as { id: string }).id) {
    notFound();
  }

  const paramsResolved = await searchParams;
  return (
    <WantedMatchesContent
      wantedItem={{
        id: wantedItem.id,
        productName: wantedItem.productName,
        strength: wantedItem.strength,
        maxPrice: wantedItem.maxPrice,
        quantity: wantedItem.quantity,
        quantityKind: wantedItem.quantityKind,
        unitsPerPack: wantedItem.unitsPerPack,
      }}
      searchParams={paramsResolved}
    />
  );
}
