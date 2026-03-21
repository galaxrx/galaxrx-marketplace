import { prisma } from "@/lib/prisma";
import { sendWantedMatch } from "@/lib/resend";

const baseUrl = process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au";

function productNameMatches(listingName: string, wantedName: string): boolean {
  const a = listingName.trim().toLowerCase();
  const b = wantedName.trim().toLowerCase();
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

/**
 * When a new listing is created, find active wanted items that match (same product)
 * and notify those users by email (if preference on) and in-app message.
 */
export async function notifyWantedMatchForListing(listing: {
  id: string;
  productName: string;
  pharmacyId: string;
}) {
  const now = new Date();
  const wantedItems = await prisma.wantedItem.findMany({
    where: {
      isActive: true,
      expiresAt: { gt: now },
      pharmacyId: { not: listing.pharmacyId },
    },
    include: {
      pharmacy: {
        select: { id: true, email: true, name: true, notifyWantedMatch: true },
      },
    },
  });

  const matching = wantedItems.filter((w) =>
    productNameMatches(listing.productName, w.productName)
  );
  if (matching.length === 0) return;

  const [lister] = await prisma.pharmacy.findMany({
    where: { id: listing.pharmacyId },
    select: { name: true },
  });
  const listerName = lister?.name ?? "A pharmacy";
  const listingUrl = `${baseUrl}/listings/${listing.id}`;

  for (const wanted of matching) {
    const recipientId = wanted.pharmacy.id;
    const recipientEmail = wanted.pharmacy.email;
    const threadId = `listing_${listing.id}_${recipientId}_${listing.pharmacyId}`;

    if (recipientEmail && wanted.pharmacy.notifyWantedMatch) {
      try {
        await sendWantedMatch(
          recipientEmail,
          listing.productName,
          listingUrl,
          listerName
        );
      } catch (e) {
        console.error("Wanted-match email failed:", e);
      }
    }

    const existing = await prisma.message.findFirst({
      where: { threadId },
    });
    if (!existing) {
      const content = `A product you wanted is now available. Check your dashboard for details.`;
      await prisma.message.create({
        data: {
          threadId,
          senderId: listing.pharmacyId,
          recipientId,
          content,
          listingId: listing.id,
        },
      });
    }
  }
}
