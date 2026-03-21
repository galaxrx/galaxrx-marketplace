import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SettingsClient from "@/components/settings/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const pharmacyId = (session?.user as { id?: string })?.id;
  if (!pharmacyId) redirect("/login");

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: pharmacyId },
    select: {
      name: true,
      email: true,
      abn: true,
      address: true,
      suburb: true,
      state: true,
      postcode: true,
      approvalNumber: true,
      phone: true,
      mobile: true,
      logoUrl: true,
      isVerified: true,
      stripeAccountId: true,
      notifyNewSale: true,
      notifyPurchase: true,
      notifyNewMessage: true,
      notifyOrderShipped: true,
      notifyOrderDelivered: true,
      notifyWantedMatch: true,
    },
  });
  if (!pharmacy) return null;

  return (
    <div className="p-4 md:p-6 w-full max-w-none">
      <h1 className="text-2xl font-heading font-bold text-gold mb-6">Settings</h1>
      <SettingsClient pharmacy={pharmacy} />
    </div>
  );
}
