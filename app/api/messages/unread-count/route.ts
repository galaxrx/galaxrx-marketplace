import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// In-memory cache: avoid repeated DB hits when many components mount (e.g. HMR).
// Short TTL so badge updates within a few seconds.
const CACHE_MS = 5_000;
const cache = new Map<string, { count: number; until: number }>();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const now = Date.now();
  const hit = cache.get(pharmacyId);
  if (hit && hit.until > now) {
    return NextResponse.json(
      { count: hit.count },
      { headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=10" } }
    );
  }
  const count = await prisma.message.count({
    where: {
      recipientId: pharmacyId,
      isRead: false,
    },
  });
  cache.set(pharmacyId, { count, until: now + CACHE_MS });
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=10" } }
  );
}
