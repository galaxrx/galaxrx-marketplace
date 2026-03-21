import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** How long (ms) to consider a user "online" after last activity */
const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const USER_UPDATE_INTERVAL_MS = 2 * 60 * 1000;
const CACHE_TTL_MS = 15_000;
const onlineCountCache = { count: 0, until: 0 };
const lastSeenUpdateByUser = new Map<string, number>();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ count: 0 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ count: 0 });

  const now = new Date();
  const cutoff = new Date(now.getTime() - ONLINE_WINDOW_MS);

  const nowMs = now.getTime();
  const lastUpdateAt = lastSeenUpdateByUser.get(userId) ?? 0;
  if (nowMs - lastUpdateAt >= USER_UPDATE_INTERVAL_MS) {
    // Avoid writing on every poll; keep user online with a bounded heartbeat.
    await prisma.pharmacy.updateMany({
      where: { id: userId },
      data: { lastSeenAt: now },
    });
    lastSeenUpdateByUser.set(userId, nowMs);
  }

  if (onlineCountCache.until > nowMs) {
    return NextResponse.json(
      { count: onlineCountCache.count },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
    );
  }

  const count = await prisma.pharmacy.count({ where: { lastSeenAt: { gte: cutoff } } });
  onlineCountCache.count = count;
  onlineCountCache.until = nowMs + CACHE_TTL_MS;

  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
  );
}
