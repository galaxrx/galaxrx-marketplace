/**
 * Create a platform admin account (web owner). This is NOT a pharmacy — it's an
 * admin-only login. You get access to /admin only, not the marketplace.
 * Run: npx ts-node -P tsconfig.scripts.json scripts/create-admin.ts your@email.com YourPassword
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const PLATFORM_ADMIN_ABN = "99999999999";
const PLATFORM_ADMIN_APPROVAL = "PLATFORM-ADMIN";

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx ts-node -P tsconfig.scripts.json scripts/create-admin.ts <email> <password>");
    console.error("Example: npm run db:create-admin -- team@galaxrx.com.au MySecurePass123");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await prisma.pharmacy.findUnique({
    where: { email },
  });

  if (existing) {
    console.error(`An account with email ${email} already exists.`);
    console.error("Use db:set-admin to make that account an admin, or use a different email.");
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);
  await prisma.pharmacy.create({
    data: {
      name: "Platform Admin",
      email,
      passwordHash,
      abn: PLATFORM_ADMIN_ABN,
      approvalNumber: PLATFORM_ADMIN_APPROVAL,
      address: "N/A",
      suburb: "N/A",
      state: "NSW",
      postcode: "0000",
      phone: "N/A",
      role: "ADMIN",
      isVerified: true,
    },
  });

  console.log(`Platform admin account created: ${email}`);
  console.log("Log in at /login — you will be taken to the Admin panel only (no marketplace).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
