/**
 * Seed ~500 DrugMaster records + test pharmacies + sample listings.
 * Drug list: curated SAMPLE (Panadol, Ventolin, Ozempic, etc.) for demo — not a full
 * TGA/PBS database. Run: npm run db:seed
 */
import { PrismaClient, Category } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const TEST_PASSWORD = "TestPassword1";

const TEST_PHARMACIES = [
  {
    email: "buyer@galaxrx.com.au",
    name: "City Central Pharmacy",
    abn: "11111111111",
    approvalNumber: "SEED001",
    address: "100 George St",
    suburb: "Sydney",
    state: "NSW" as const,
    postcode: "2000",
    phone: "0298765001",
  },
  {
    email: "testbuyer@galaxrx.com.au",
    name: "Test Buyer Pharmacy",
    abn: "44444444444",
    approvalNumber: "SEED004",
    address: "88 Buyer Rd",
    suburb: "Ryde",
    state: "NSW" as const,
    postcode: "2112",
    phone: "0298765004",
  },
  {
    email: "seller1@galaxrx.com.au",
    name: "Northside Chemist",
    abn: "22222222222",
    approvalNumber: "SEED002",
    address: "50 Pacific Hwy",
    suburb: "North Sydney",
    state: "NSW" as const,
    postcode: "2060",
    phone: "0298765002",
  },
  {
    email: "seller2@galaxrx.com.au",
    name: "Westside Pharmacy",
    abn: "33333333333",
    approvalNumber: "SEED003",
    address: "200 Parramatta Rd",
    suburb: "Parramatta",
    state: "NSW" as const,
    postcode: "2150",
    phone: "0298765003",
  },
  {
    email: "test@galaxrx.com.au",
    name: "Test Pharmacy",
    abn: "12345678901",
    approvalNumber: "TEST001",
    address: "123 Test St",
    suburb: "Sydney",
    state: "NSW" as const,
    postcode: "2000",
    phone: "0298765432",
  },
];

const DRUGS: Array<{
  productName: string;
  genericName?: string;
  brand?: string;
  strength?: string;
  form?: string;
  packSize?: number;
  pbsCode?: string;
  barcode?: string;
  category: Category;
}> = [
  { productName: "Panadol 500mg Tablets", genericName: "Paracetamol", brand: "GSK", strength: "500mg", form: "tablet", packSize: 20, pbsCode: "1234A", barcode: "9300600001234", category: "OTC" },
  { productName: "Panadol Osteo 665mg Tablets", genericName: "Paracetamol", brand: "GSK", strength: "665mg", form: "tablet", packSize: 24, pbsCode: "1235A", category: "OTC" },
  { productName: "Nurofen 200mg Tablets", genericName: "Ibuprofen", brand: "Reckitt", strength: "200mg", form: "tablet", packSize: 24, category: "OTC" },
  { productName: "Ventolin 100mcg Inhaler", genericName: "Salbutamol", brand: "GSK", strength: "100mcg", form: "inhaler", packSize: 1, pbsCode: "3456C", barcode: "9300600012345", category: "PRESCRIPTION" },
  { productName: "Seretide 50/250 Accuhaler", genericName: "Salmeterol/Fluticasone", brand: "GSK", strength: "50/250mcg", form: "inhaler", packSize: 1, pbsCode: "4567D", category: "PRESCRIPTION" },
  { productName: "Ozempic 1mg Pre-filled Pen", genericName: "Semaglutide", brand: "Novo Nordisk", strength: "1mg", form: "injection", packSize: 1, pbsCode: "7890G", category: "PRESCRIPTION" },
  { productName: "Ozempic 0.5mg Pre-filled Pen", genericName: "Semaglutide", brand: "Novo Nordisk", strength: "0.5mg", form: "injection", packSize: 1, pbsCode: "7891G", category: "PRESCRIPTION" },
  { productName: "Nexium 40mg Tablets", genericName: "Esomeprazole", brand: "AstraZeneca", strength: "40mg", form: "tablet", packSize: 30, pbsCode: "9012I", category: "PRESCRIPTION" },
  { productName: "Lipitor 40mg Tablets", genericName: "Atorvastatin", brand: "Pfizer", strength: "40mg", form: "tablet", packSize: 30, pbsCode: "2345L", category: "PRESCRIPTION" },
  { productName: "Metformin 500mg Tablets", genericName: "Metformin", brand: "Generic", strength: "500mg", form: "tablet", packSize: 60, pbsCode: "6789P", category: "PRESCRIPTION" },
  { productName: "Amoxicillin 500mg Capsules", genericName: "Amoxicillin", brand: "Generic", strength: "500mg", form: "capsule", packSize: 20, pbsCode: "0123T", category: "PRESCRIPTION" },
  { productName: "FluQuadri 2024 Vaccine", genericName: "Influenza vaccine", brand: "Sanofi", form: "injection", packSize: 1, category: "VACCINES" },
  { productName: "Ostelin Vitamin D 1000IU", genericName: "Cholecalciferol", brand: "Ostelin", strength: "1000IU", form: "tablet", packSize: 30, category: "SUPPLEMENTS" },
  { productName: "Paracetamol 500mg Tablets", genericName: "Paracetamol", strength: "500mg", form: "tablet", packSize: 20, category: "OTC" },
  { productName: "Ibuprofen 200mg Tablets", genericName: "Ibuprofen", strength: "200mg", form: "tablet", packSize: 24, category: "OTC" },
  { productName: "Cetirizine 10mg Tablets", genericName: "Cetirizine", strength: "10mg", form: "tablet", packSize: 30, category: "OTC" },
  { productName: "Omeprazole 20mg Capsules", genericName: "Omeprazole", strength: "20mg", form: "capsule", packSize: 14, category: "OTC" },
  { productName: "Voltaren 50mg Tablets", genericName: "Diclofenac", brand: "GSK", strength: "50mg", form: "tablet", packSize: 20, pbsCode: "2345B", category: "OTC" },
  { productName: "Symbicort 200/6 Turbuhaler", genericName: "Budesonide/Formoterol", brand: "AstraZeneca", strength: "200/6mcg", form: "inhaler", packSize: 1, pbsCode: "5678E", category: "PRESCRIPTION" },
  { productName: "Trulicity 1.5mg Pre-filled Pen", genericName: "Dulaglutide", brand: "Eli Lilly", strength: "1.5mg", form: "injection", packSize: 1, pbsCode: "9012S", category: "PRESCRIPTION" },
];

// Expand to ~500: duplicate with pack size / strength variants
function expandDrugs(): typeof DRUGS {
  const out: typeof DRUGS = [];
  const packs = [1, 5, 10, 14, 20, 24, 28, 30, 50, 60];
  for (let i = 0; i < 32; i++) {
    for (const d of DRUGS) {
      if (out.length >= 500) break;
      const packSize = packs[i % packs.length] ?? d.packSize ?? 20;
      out.push({
        ...d,
        packSize,
        barcode: d.barcode && out.filter((x) => x.barcode === d.barcode).length === 0 ? d.barcode : undefined,
      });
    }
  }
  return out.slice(0, 500);
}

async function main() {
  const drugs = expandDrugs();
  console.log(`Seeding ${drugs.length} DrugMaster records...`);
  await prisma.drugMaster.deleteMany({});
  await prisma.drugMaster.createMany({
    data: drugs.map((d) => ({
      productName: d.productName,
      genericName: d.genericName ?? null,
      brand: d.brand ?? null,
      strength: d.strength ?? null,
      form: d.form ?? null,
      packSize: d.packSize ?? null,
      pbsCode: d.pbsCode ?? null,
      barcode: d.barcode ?? null,
      category: d.category,
    })),
  });
  const count = await prisma.drugMaster.count();
  console.log(`Seeded ${count} drug records.`);

  // Test pharmacies: update password if email exists; otherwise create only if ABN is free
  const passwordHash = await hash(TEST_PASSWORD, 12);
  for (const p of TEST_PHARMACIES) {
    const existingByEmail = await prisma.pharmacy.findUnique({ where: { email: p.email } });
    if (existingByEmail) {
      await prisma.pharmacy.update({
        where: { email: p.email },
        data: { passwordHash, isVerified: true },
      });
      console.log("Test pharmacy ready:", p.email);
    } else {
      const existingByAbn = await prisma.pharmacy.findUnique({ where: { abn: p.abn } });
      if (!existingByAbn) {
        await prisma.pharmacy.create({
          data: {
            name: p.name,
            email: p.email,
            abn: p.abn,
            approvalNumber: p.approvalNumber,
            address: p.address,
            suburb: p.suburb,
            state: p.state,
            postcode: p.postcode,
            phone: p.phone,
            passwordHash,
            isVerified: true,
            role: "PHARMACY",
          },
        });
        console.log("Created test pharmacy:", p.email);
      } else {
        console.log("Skipped (email and/or ABN already used):", p.email);
      }
    }
  }
  console.log("Login with any test email + password:", TEST_PASSWORD);

  // Sample listings so "buyer" can buy from "seller1" and "seller2"
  const seller1 = await prisma.pharmacy.findUnique({ where: { email: "seller1@galaxrx.com.au" } });
  const seller2 = await prisma.pharmacy.findUnique({ where: { email: "seller2@galaxrx.com.au" } });
  const someDrugs = await prisma.drugMaster.findMany({ take: 6, where: { category: "OTC" } });
  if (seller1 && seller2 && someDrugs.length >= 3) {
    const inSixMonths = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const inNineMonths = new Date(Date.now() + 270 * 24 * 60 * 60 * 1000);
    const listingsData = [
      { pharmacyId: seller1.id, drug: someDrugs[0], price: 8.5, qty: 10, expiry: inSixMonths },
      { pharmacyId: seller1.id, drug: someDrugs[1], price: 12, qty: 5, expiry: inNineMonths },
      { pharmacyId: seller1.id, drug: someDrugs[2], price: 6, qty: 20, expiry: inSixMonths },
      { pharmacyId: seller2.id, drug: someDrugs[0], price: 7.9, qty: 15, expiry: inSixMonths },
      { pharmacyId: seller2.id, drug: someDrugs[1], price: 11.5, qty: 8, expiry: inNineMonths },
      { pharmacyId: seller2.id, drug: someDrugs[2], price: 5.5, qty: 25, expiry: inSixMonths },
    ];
    const existingCount = await prisma.listing.count({
      where: { pharmacyId: { in: [seller1.id, seller2.id] } },
    });
    if (existingCount === 0) {
      for (const row of listingsData) {
        await prisma.listing.create({
          data: {
            pharmacyId: row.pharmacyId,
            drugMasterId: row.drug.id,
            productName: row.drug.productName,
            genericName: row.drug.genericName ?? null,
            brand: row.drug.brand ?? null,
            strength: row.drug.strength ?? null,
            form: row.drug.form ?? null,
            packSize: row.drug.packSize ?? 20,
            quantityUnits: row.qty * Math.max(row.drug.packSize ?? 1, 1),
            reservedUnits: 0,
            expiryDate: row.expiry,
            expiresAt: row.expiry,
            pricePerPack: row.price,
            originalRRP: row.price * 1.2,
            images: [],
            category: row.drug.category,
            condition: "SEALED",
            fulfillmentType: "NATIONAL_SHIPPING",
            isActive: true,
          },
        });
      }
      console.log("Created 6 sample listings (from seller1 & seller2). Log in as buyer@ to buy.");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
