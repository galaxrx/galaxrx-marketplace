/**
 * Delete a pharmacy (and all their data) by email.
 * Use with care - this cannot be undone.
 * Run: npx ts-node -P tsconfig.scripts.json scripts/delete-pharmacy.ts your@email.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase();
  if (!email) {
    console.error("Usage: npx ts-node -P tsconfig.scripts.json scripts/delete-pharmacy.ts <email>");
    console.error("Example: npm run db:delete-pharmacy -- galaxrx.team@gmail.com");
    process.exit(1);
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { email },
  });

  if (!pharmacy) {
    console.error(`No pharmacy found with email: ${email}`);
    process.exit(1);
  }

  const id = pharmacy.id;
  console.log(`Deleting ${pharmacy.name} (${email}) and all related data...`);

  await prisma.$transaction(async (tx) => {
    await tx.review.deleteMany({ where: { OR: [{ reviewerId: id }, { subjectId: id }] } });
    await tx.order.deleteMany({ where: { OR: [{ buyerId: id }, { sellerId: id }] } });
    await tx.listing.deleteMany({ where: { pharmacyId: id } });
    await tx.message.deleteMany({ where: { OR: [{ senderId: id }, { recipientId: id }] } });
    await tx.wantedItem.deleteMany({ where: { pharmacyId: id } });
    await tx.pharmacy.delete({ where: { id } });
  });

  console.log(`Done. ${pharmacy.name} (${email}) has been deleted.`);
  console.log("You can register again at /register with the same email if needed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
