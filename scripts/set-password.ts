/**
 * Set a new password for a pharmacy by email.
 * Use this if you never set a password or can't use "Forgot password".
 * Run: npx ts-node -P tsconfig.scripts.json scripts/set-password.ts your@email.com YourNewPassword
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim()?.toLowerCase();
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Usage: npx ts-node -P tsconfig.scripts.json scripts/set-password.ts <email> <new-password>");
    console.error("Example: npm run db:set-password -- my@email.com MySecret123");
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const pharmacy = await prisma.pharmacy.findUnique({
    where: { email },
  });

  if (!pharmacy) {
    console.error(`No pharmacy found with email: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hash(newPassword, 12);
  await prisma.pharmacy.update({
    where: { email },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
  });

  console.log(`Password updated for ${pharmacy.name} (${email}).`);
  console.log(`You can now log in at /login with this email and your new password.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
