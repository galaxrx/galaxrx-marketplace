/**
 * Create a new Prisma migration without using a shadow database.
 * Use when migrate dev fails (e.g. Supabase pooler, P3006, P1001).
 *
 * Usage: node scripts/create-migration.js <migration_name>
 * Example: node scripts/create-migration.js add_user_preferences
 *
 * Then run: npx prisma migrate deploy
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load .env from project root (same as Prisma)
const projectRoot = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(projectRoot, ".env") });

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Usage: node scripts/create-migration.js <migration_name>");
  console.error("Example: node scripts/create-migration.js add_user_preferences");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env in the project root.");
  process.exit(1);
}

const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "") + "000000";
const migrationDir = path.join(__dirname, "..", "prisma", "migrations", `${timestamp}_${name}`);

if (fs.existsSync(migrationDir)) {
  console.error("Migration directory already exists:", migrationDir);
  process.exit(1);
}

fs.mkdirSync(migrationDir, { recursive: true });
const migrationFile = path.join(migrationDir, "migration.sql");
const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");

try {
  const sql = execSync(
    `npx prisma migrate diff --from-url "${process.env.DATABASE_URL}" --to-schema-datamodel "${schemaPath}" --script`,
    { cwd: path.join(__dirname, ".."), encoding: "utf8", env: process.env }
  );
  const content = (sql && sql.trim()) ? sql.trim() + "\n" : "-- No schema changes\nSELECT 1;\n";
  fs.writeFileSync(migrationFile, content, "utf8");
  console.log("Created:", path.relative(process.cwd(), migrationFile));
  console.log("Apply with: npx prisma migrate deploy");
} catch (e) {
  console.error("Prisma migrate diff failed:", e.stderr || e.message);
  fs.rmSync(migrationDir, { recursive: true, force: true });
  if ((e.stderr || e.message || "").includes("P1001") || (e.stderr || e.message || "").includes("Can't reach")) {
    console.error("\nTip: Use your Supabase 'Direct connection' URL in .env for migrations (not the pooler).");
  }
  process.exit(1);
}
