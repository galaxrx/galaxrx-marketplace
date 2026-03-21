import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PayAcceptedOfferClient from "@/components/wanted/PayAcceptedOfferClient";

export const dynamic = "force-dynamic";

export default async function PayAcceptedOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { offerId } = await params;

  const offer = await prisma.wantedOffer.findFirst({
    where: { id: offerId, status: "ACCEPTED" },
    include: {
      wantedItem: true,
      seller: { select: { id: true, name: true, isVerified: true, state: true } },
    },
  });
  if (!offer) redirect("/wanted");
  if (offer.wantedItem.pharmacyId !== (session.user as { id: string }).id) {
    redirect("/wanted");
  }

  return (
    <PayAcceptedOfferClient
      offer={{
        id: offer.id,
        quantity: offer.quantity,
        pricePerPack: offer.pricePerPack,
        pricePerUnit: offer.pricePerUnit,
        wantedItem: {
          productName: offer.wantedItem.productName,
          strength: offer.wantedItem.strength ?? null,
        },
        seller: offer.seller,
      }}
    />
  );
}
