/**
 * Sync product catalog from Medipim AU API V4 into DrugMaster.
 * Run: npm run sync:medipim
 *
 * Requires .env: MEDIPIM_API_KEY and MEDIPIM_API_SECRET (or MEDIPIM_API_ID + MEDIPIM_API_SECRET).
 * Optional: MEDIPIM_API_BASE (default https://api.au.medipim.com), MEDIPIM_USER_AGENT.
 * Rate limit: 100 requests/minute — script respects it.
 *
 * Uses POST /v4/products/query with pagination (default 100 per page). For 10k+ products
 * consider switching to products/stream and processing line-by-line.
 */

import * as path from "path";
import * as fs from "fs";
import dotenv from "dotenv";
const root = process.cwd();
dotenv.config({ path: path.resolve(root, ".env") });
const hasMedipimKey = !!(
  (process.env.MEDIPIM_API_KEY ?? process.env.MEDIPIM_API_ID)?.trim() &&
  process.env.MEDIPIM_API_SECRET?.trim()
);
if (!hasMedipimKey) {
  const localPath = path.resolve(root, ".env.local");
  if (fs.existsSync(localPath)) dotenv.config({ path: localPath });
}

import { PrismaClient } from "@prisma/client";
import {
  medipimProductsQuery,
  mapMedipimProductToDrug,
  type MedipimProductsQueryBody,
} from "../lib/medipim-api";

const prisma = new PrismaClient();

const PAGE_SIZE = 100;
const DEFAULT_FILTER = {
  filter: {
    and: [{ status: "active" as const }, { minimumContent: true }],
  },
  sorting: { id: "ASC" as const },
  page: { size: PAGE_SIZE, no: 0 },
} satisfies MedipimProductsQueryBody;

async function main() {
  const base = process.env.MEDIPIM_API_BASE?.trim() || "https://api.au.medipim.com";
  const keyVar = process.env.MEDIPIM_API_KEY?.trim()
    ? "MEDIPIM_API_KEY"
    : process.env.MEDIPIM_API_ID?.trim()
      ? "MEDIPIM_API_ID"
      : null;
  const hasKey = !!(
    keyVar &&
    (process.env.MEDIPIM_API_KEY ?? process.env.MEDIPIM_API_ID)?.trim() &&
    process.env.MEDIPIM_API_SECRET?.trim()
  );
  console.log("Medipim sync: base URL:", base, hasKey ? `(key from ${keyVar})` : "(no credentials)");
  if (!hasKey) {
    console.error("\n--- Medipim API requires API key + secret. ---");
    console.error("In .env set: MEDIPIM_API_KEY=<key> and MEDIPIM_API_SECRET=<secret>");
    console.error("Get credentials from: info@medipim.com");
    console.error("Docs: https://platform.au.medipim.com/docs/api/v4/using-the-api.html");
    console.error("----------------------------------------\n");
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let pageNo = 0;

  try {
    for (;;) {
      const body: MedipimProductsQueryBody = {
        ...DEFAULT_FILTER,
        page: { size: PAGE_SIZE, no: pageNo },
      };
      const res = await medipimProductsQuery(body);
      const results = res.results ?? [];
      const meta = res.meta?.page;
      console.log(
        `Page ${pageNo + 1}: got ${results.length} products`,
        meta ? `(offset ${meta.offset})` : ""
      );
      if (results.length === 0) break;

      for (const p of results) {
        const item = mapMedipimProductToDrug(p);
        if (!item.productName || item.productName === "Unknown") {
          skipped++;
          continue;
        }

        const barcode = item.barcode || null;
        const pbsCode = item.pbsCode || null;

        if (barcode) {
          const existing = await prisma.drugMaster.findUnique({ where: { barcode } });
          if (existing) {
            await prisma.drugMaster.update({
              where: { barcode },
              data: {
                productName: item.productName,
                genericName: item.genericName,
                brand: item.brand,
                strength: item.strength,
                form: item.form,
                packSize: item.packSize,
                pbsCode,
                category: item.category,
                imageUrl: item.imageUrl,
              },
            });
            updated++;
          } else {
            await prisma.drugMaster.create({
              data: {
                productName: item.productName,
                genericName: item.genericName,
                brand: item.brand,
                strength: item.strength,
                form: item.form,
                packSize: item.packSize,
                pbsCode,
                barcode,
                category: item.category,
                imageUrl: item.imageUrl,
              },
            });
            created++;
          }
          continue;
        }

        if (pbsCode) {
          const existing = await prisma.drugMaster.findFirst({ where: { pbsCode } });
          if (existing) {
            await prisma.drugMaster.update({
              where: { id: existing.id },
              data: {
                productName: item.productName,
                genericName: item.genericName,
                brand: item.brand,
                strength: item.strength,
                form: item.form,
                packSize: item.packSize,
                category: item.category,
                imageUrl: item.imageUrl,
              },
            });
            updated++;
          } else {
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
                  category: item.category,
                  imageUrl: item.imageUrl,
                },
              });
              created++;
            } catch (err) {
              console.warn("Skip create (no barcode):", item.productName, (err as Error).message);
              skipped++;
            }
          }
          continue;
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
              category: item.category,
              imageUrl: item.imageUrl,
            },
          });
          created++;
        } catch (err) {
          console.warn("Skip create:", item.productName, (err as Error).message);
          skipped++;
        }
      }

      if (results.length < PAGE_SIZE) break;
      pageNo++;
    }

    console.log("Done. Created:", created, "Updated:", updated, "Skipped:", skipped);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("401") || msg.includes("Unauthorized")) {
      console.error("\n--- Medipim API returned 401 (invalid key/secret). ---");
      console.error("Check MEDIPIM_API_KEY and MEDIPIM_API_SECRET in .env");
      console.error("----------------------------------------\n");
      process.exit(1);
    }
    if (msg.includes("429") || msg.includes("too_many_requests")) {
      console.error("\n--- Medipim rate limit (100/min). Wait and retry. ---\n");
      process.exit(1);
    }
    throw e;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
