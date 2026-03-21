/**
 * One-time script: add noteToPurchasers and updatedAt to Listing table.
 * Run: npx ts-node -P tsconfig.scripts.json scripts/add-listing-columns.ts
 * Or: npm run db:add-listing-columns (if added to package.json)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "noteToPurchasers" TEXT;
  `);
  console.log("Added noteToPurchasers (if missing).");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  `);
  console.log("Added updatedAt (if missing).");

  console.log("Done. Restart your dev server and refresh the BUY page.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
