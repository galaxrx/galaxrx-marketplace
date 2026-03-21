import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTopicSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  body: z.string().min(1).max(5000).trim(),
});

const FORUM_GET_CACHE_MS = 5_000;
const forumGetCache = new Map<string, { data: unknown; until: number }>();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const cacheKey = "forum-topics";
  const now = Date.now();
  const hit = forumGetCache.get(cacheKey);
  if (hit && hit.until > now) {
    return NextResponse.json(hit.data);
  }
  try {
    const topics = await prisma.forumTopic.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        author: { select: { id: true, name: true, isVerified: true, state: true } },
        _count: { select: { replies: true } },
      },
    });
    forumGetCache.set(cacheKey, { data: topics, until: now + FORUM_GET_CACHE_MS });
    return NextResponse.json(topics);
  } catch (e) {
    console.error("[GET /api/forum]", e);
    const msg = e instanceof Error ? e.message : String(e);
    const isPrisma =
      msg.includes("prisma") ||
      msg.includes("table") ||
      msg.includes("does not exist") ||
      msg.includes("forumTopic");
    const hint = isPrisma
      ? " Stop the dev server, run: npx prisma generate — then start the dev server again."
      : "";
    return NextResponse.json(
      { message: `Failed to load topics.${hint}`, detail: process.env.NODE_ENV === "development" ? msg : undefined },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: (session.user as { id: string }).id },
  });
  if (!pharmacy?.isVerified) {
    return NextResponse.json(
      { message: "Only verified pharmacies can create forum topics." },
      { status: 403 }
    );
  }
  try {
    const body = await req.json();
    const parsed = createTopicSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const topic = await prisma.forumTopic.create({
      data: {
        authorId: (session.user as { id: string }).id,
        title: parsed.data.title,
        body: parsed.data.body,
      },
      include: {
        author: { select: { id: true, name: true, isVerified: true, state: true } },
      },
    });
    forumGetCache.delete("forum-topics");
    return NextResponse.json(topic);
  } catch (e) {
    console.error(e);
    const msg =
      e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
        ? (e as { message: string }).message
        : "Failed to create topic";
    const isPrisma = msg.includes("prisma") || msg.includes("table") || msg.includes("does not exist");
    return NextResponse.json(
      { message: isPrisma ? "Database not ready. Please run: npx prisma migrate dev" : "Failed to create topic" },
      { status: 500 }
    );
  }
}
