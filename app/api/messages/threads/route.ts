import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const THREADS_CACHE_MS = 3_000;
const threadsCache = new Map<string, { data: unknown; until: number }>();

/** One query for latest messages per thread, one for unread counts (avoids N+1). Short cache to dedupe Strict Mode / double mount. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacyId = (session.user as { id: string }).id;
  const now = Date.now();
  const hit = threadsCache.get(pharmacyId);
  if (hit && hit.until > now) {
    return NextResponse.json(hit.data);
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: pharmacyId }, { recipientId: pharmacyId }],
    },
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      sender: { select: { id: true, name: true, isVerified: true } },
      recipient: { select: { id: true, name: true, isVerified: true } },
    },
  });

  const threadIds = new Set<string>();
  const latestPerThread: Array<{
    threadId: string;
    other: { id: string; name: string; isVerified: boolean };
    lastMessage: string;
    lastAt: Date;
  }> = [];
  for (const m of messages) {
    if (threadIds.has(m.threadId)) continue;
    threadIds.add(m.threadId);
    const other = m.senderId === pharmacyId ? m.recipient : m.sender;
    latestPerThread.push({
      threadId: m.threadId,
      other: { id: other.id, name: other.name, isVerified: other.isVerified },
      lastMessage: m.content.slice(0, 80) + (m.content.length > 80 ? "…" : ""),
      lastAt: m.createdAt,
    });
  }

  const threadIdList = Array.from(threadIds);
  const unreadCounts =
    threadIdList.length === 0
      ? []
      : await prisma.message.groupBy({
          by: ["threadId"],
          where: {
            threadId: { in: threadIdList },
            recipientId: pharmacyId,
            isRead: false,
          },
          _count: { id: true },
        });
  const unreadByThread = new Map(
    unreadCounts.map((u) => [u.threadId, u._count.id])
  );

  const threads = latestPerThread
    .map((t) => ({
      ...t,
      unread: unreadByThread.get(t.threadId) ?? 0,
    }))
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  threadsCache.set(pharmacyId, { data: threads, until: now + THREADS_CACHE_MS });
  return NextResponse.json(threads);
}
