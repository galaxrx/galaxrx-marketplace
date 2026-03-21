/**
 * One-time: add latitude/longitude to Pharmacy for distance / nearest sort.
 * Run: npx ts-node -P tsconfig.scripts.json scripts/add-pharmacy-lat-lng.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Pharmacy" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Pharmacy" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
  `);
  console.log("Added Pharmacy latitude/longitude (if missing).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
