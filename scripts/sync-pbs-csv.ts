/**
 * Import PBS ITEM data from a local CSV file into DrugMaster.
 * Download monthly ITEM CSV from https://data.pbs.gov.au/ or https://www.pbs.gov.au/info/browse/download
 *
 * Run: npm run sync:pbs-csv -- path/to/ITEM.csv
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { mapPbsItemToDrug } from "../lib/pbs-api";
import type { PBSItem } from "../lib/pbs-api";

const prisma = new PrismaClient();

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let cell = "";
      while (i < line.length && line[i] !== '"') {
        if (line[i] === "\\") i++;
        cell += line[i++];
      }
      if (line[i] === '"') i++;
      out.push(cell);
      if (line[i] === ",") i++;
    } else {
      const end = line.indexOf(",", i);
      const cell = end === -1 ? line.slice(i) : line.slice(i, end);
      out.push(cell.trim());
      i = end === -1 ? line.length : end + 1;
    }
  }
  return out;
}

function csvToRows(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h.trim()] = values[j]?.trim() ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function rowToPbsItem(row: Record<string, string>): PBSItem {
  const get = (key: string) => row[key] ?? row[key.toLowerCase()] ?? "";
  return {
    DRUG_NAME: get("DRUG_NAME") || undefined,
    BRAND_NAME: get("BRAND_NAME") || undefined,
    LI_FORM: get("LI_FORM") || undefined,
    LI_DRUG_NAME: get("LI_DRUG_NAME") || undefined,
    PACK_SIZE: get("PACK_SIZE") || undefined,
    PBS_CODE: get("PBS_CODE") || undefined,
    PROGRAM_CODE: get("PROGRAM_CODE") || undefined,
  };
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: npm run sync:pbs-csv -- <path-to-ITEM.csv>");
    console.error("Example: npm run sync:pbs-csv -- ./ITEM.csv");
    console.error("Download the PBS ITEM CSV from https://data.pbs.gov.au/ or https://www.pbs.gov.au/info/browse/download");
    process.exit(1);
  }
  const isPlaceholder = /path[\\/]to[\\/]ITEM\.csv$/i.test(csvPath.replace(/\\/g, "/"));
  if (isPlaceholder) {
    console.error("You used the placeholder 'path/to/ITEM.csv'. You need a real CSV file.");
    console.error("");
    console.error("1. Download the PBS ITEM (or schedule items) CSV from:");
    console.error("   https://data.pbs.gov.au/");
    console.error("   or https://www.pbs.gov.au/info/browse/download");
    console.error("2. Save it (e.g. as ITEM.csv) in your project or anywhere on disk.");
    console.error("3. Run: npm run sync:pbs-csv -- <full-or-relative-path-to-your-file>");
    console.error("   Example: npm run sync:pbs-csv -- ./downloads/ITEM.csv");
    process.exit(1);
  }
  // Normalize path (Windows: argv may have backslashes; resolve handles both)
  const resolved = path.resolve(csvPath.startsWith("F:") || csvPath.startsWith("C:") ? csvPath : path.join(process.cwd(), csvPath));
  if (!fs.existsSync(resolved)) {
    console.error("File not found:", resolved);
    console.error("");
    console.error("Steps:");
    console.error("  1. Create a folder, e.g.: mkdir downloads");
    console.error("  2. Download the PBS ITEM CSV from https://data.pbs.gov.au/ or https://www.pbs.gov.au/info/browse/download");
    console.error("  3. Save it as ITEM.csv inside that folder.");
    console.error("  4. Run: npm run sync:pbs-csv -- ./downloads/ITEM.csv");
    process.exit(1);
  }

  console.log("Reading CSV:", resolved);
  const rows = csvToRows(resolved);
  console.log("Rows read:", rows.length);

  let created = 0;
  let skipped = 0;
  const category = "PRESCRIPTION";

  for (const row of rows) {
    const item = mapPbsItemToDrug(rowToPbsItem(row));
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
