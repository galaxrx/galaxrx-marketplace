/**
 * Add isSOS column to WantedItem for SOS (urgent for patients) flag.
 * Run: npx ts-node -P tsconfig.scripts.json scripts/add-wanted-sos.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "WantedItem" ADD COLUMN IF NOT EXISTS "isSOS" BOOLEAN NOT NULL DEFAULT false;
  `);
  console.log("Added WantedItem.isSOS (if missing).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
