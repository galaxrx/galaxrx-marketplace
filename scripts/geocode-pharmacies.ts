/**
 * Geocode pharmacy addresses to fill latitude/longitude (for distance on Buy listings).
 * Uses OpenStreetMap Nominatim (free, no API key). Run: npx ts-node -P tsconfig.scripts.json scripts/geocode-pharmacies.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function geocode(address: string, suburb: string, state: string, postcode: string): Promise<{ lat: number; lon: number } | null> {
  const q = [address, suburb, state, postcode, "Australia"].filter(Boolean).join(", ");
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "GalaxRX-Marketplace/1.0" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);
  if (isNaN(lat) || isNaN(lon)) return null;
  return { lat, lon };
}

async function main() {
  const pharmacies = await prisma.pharmacy.findMany({
    where: { OR: [{ latitude: null }, { longitude: null }] },
    select: { id: true, name: true, address: true, suburb: true, state: true, postcode: true },
  });
  console.log(`Found ${pharmacies.length} pharmacies without coordinates.`);
  for (const p of pharmacies) {
    const coords = await geocode(p.address, p.suburb, p.state, p.postcode);
    if (coords) {
      await prisma.pharmacy.update({
        where: { id: p.id },
        data: { latitude: coords.lat, longitude: coords.lon },
      });
      console.log(`Geocoded: ${p.name} -> ${coords.lat}, ${coords.lon}`);
    } else {
      console.warn(`No result for: ${p.name}, ${p.address}, ${p.suburb} ${p.state} ${p.postcode}`);
    }
    await new Promise((r) => setTimeout(r, 1100));
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
