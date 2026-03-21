/**
 * Set a pharmacy to ADMIN role by email.
 * Run: npx ts-node -P tsconfig.scripts.json scripts/set-admin.ts your@email.com
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase();
  if (!email) {
    console.error("Usage: npx ts-node -P tsconfig.scripts.json scripts/set-admin.ts <email>");
    process.exit(1);
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { email },
  });

  if (!pharmacy) {
    console.error(`No pharmacy found with email: ${email}`);
    process.exit(1);
  }

  if (pharmacy.role === "ADMIN") {
    console.log(`${email} is already an ADMIN.`);
    return;
  }

  await prisma.pharmacy.update({
    where: { email },
    data: { role: "ADMIN" },
  });

  console.log(`Done. ${pharmacy.name} (${email}) is now an ADMIN. Log in at /login with this account to access /admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
