/**
 * Sync drug catalog from PBS (Pharmaceutical Benefits Scheme) API into DrugMaster.
 * Run: npm run sync:pbs
 *
 * Requires .env: PBS_API_BASE and PBS_PUBLIC_KEY.
 * Rate limit: 1 request per 20 seconds — script waits between calls.
 */

import * as path from "path";
import * as fs from "fs";
// Load .env from project root (ts-node doesn't load it; Next.js uses .env.local for secrets)
import dotenv from "dotenv";
const root = process.cwd();
dotenv.config({ path: path.resolve(root, ".env") });
if (!process.env.PBS_PUBLIC_KEY?.trim() && !process.env.PBS_API_KEY?.trim()) {
  const localPath = path.resolve(root, ".env.local");
  if (fs.existsSync(localPath)) dotenv.config({ path: localPath });
}

import { PrismaClient } from "@prisma/client";
import { getPbsSchedules, getPbsItems, mapPbsItemToDrug } from "../lib/pbs-api";

const prisma = new PrismaClient();

async function main() {
  const base = process.env.PBS_API_BASE?.trim() || "https://data-api.health.gov.au/pbs/api/v3";
  const keyVar =
    process.env.PBS_PUBLIC_KEY?.trim()
      ? "PBS_PUBLIC_KEY"
      : process.env.PBS_API_KEY?.trim()
        ? "PBS_API_KEY"
        : process.env.OCP_APIM_SUBSCRIPTION_KEY?.trim()
          ? "OCP_APIM_SUBSCRIPTION_KEY"
          : null;
  const hasKey = !!keyVar;
  console.log("PBS sync: base URL:", base, hasKey ? `(key from ${keyVar})` : "(no key)");
  if (!hasKey) {
    const pbsVars = Object.keys(process.env).filter((k) => k.startsWith("PBS_") || k.includes("SUBSCRIPTION"));
    if (pbsVars.length > 0) {
      console.log("PBS-related env vars found:", pbsVars.join(", "));
      console.log("Use one of: PBS_PUBLIC_KEY=... or PBS_API_KEY=... or OCP_APIM_SUBSCRIPTION_KEY=... (no spaces around =)");
    }
  }

  let scheduleCode: string | undefined;
  try {
    const schedules = await getPbsSchedules();
    if (schedules.length > 0) {
      const first = schedules[0] as { SCHEDULE_CODE?: string };
      scheduleCode = first.SCHEDULE_CODE;
      console.log("Schedules count:", schedules.length, "using code:", scheduleCode);
    }
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("Could not fetch schedules:", msg);
    if (msg.includes("401") || msg.includes("Unauthorized")) {
      console.error("\n--- PBS API returned 401 (subscription key required). ---");
      console.error("In .env set: PBS_PUBLIC_KEY=<your subscription key>");
      console.error("Get a key from Health API portal (Unregistered Public Users) or use CSV: npm run sync:pbs-csv -- ./downloads/ITEM.csv");
      console.error("----------------------------------------\n");
      process.exit(1);
    }
    if (msg.includes("403") || msg.includes("Site Disabled")) {
      console.error("\n--- PBS API returned 403 (endpoint disabled or forbidden). ---");
      console.error("In .env set: PBS_API_BASE and PBS_PUBLIC_KEY. Or use CSV import: npm run sync:pbs-csv -- ./downloads/ITEM.csv");
      console.error("----------------------------------------\n");
      process.exit(1);
    }
  }

  let items;
  try {
    items = await getPbsItems(scheduleCode);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("401") || msg.includes("Unauthorized")) {
      console.error("\n--- PBS API returned 401. Set PBS_PUBLIC_KEY in .env or use CSV import. ---\n");
      process.exit(1);
    }
    if (msg.includes("403") || msg.includes("Site Disabled")) {
      console.error("\n--- PBS API returned 403. Set PBS_API_BASE and PBS_PUBLIC_KEY in .env or use CSV import. ---\n");
      process.exit(1);
    }
    throw e;
  }
  console.log("PBS ITEM rows received:", items.length);

  let created = 0;
  let skipped = 0;
  const category = "PRESCRIPTION";

  for (const row of items) {
    const item = mapPbsItemToDrug(row);
    if (!item.productName || item.productName === "Unknown") {
      skipped++;
      continue;
    }
    const pbsCode = item.pbsCode || null;
    if (pbsCode) {
      const existing = await prisma.drugMaster.findFirst({ where: { pbsCode } });
      if (existing) {
        skipped++;
        continue;
      }
    }
    try {
      await prisma.drugMaster.create({
        data: {
          productName: item.productName,
          genericName: item.genericName,
          brand: item.brand,
          strength: item.strength,
          form: item.form,
          packSize: item.packSize,
          pbsCode,
          category,
        },
      });
      created++;
    } catch (err) {
      console.warn("Skip create:", item.productName, (err as Error).message);
    }
  }

  console.log("Done. Created:", created, "Skipped:", skipped);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
