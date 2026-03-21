import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createReplySchema = z.object({
  content: z.string().min(1).max(2000).trim(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const topic = await prisma.forumTopic.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, isVerified: true, state: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, isVerified: true, state: true } },
        },
      },
    },
  });
  if (!topic) return NextResponse.json({ message: "Topic not found" }, { status: 404 });
  return NextResponse.json(topic);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id: (session.user as { id: string }).id },
  });
  if (!pharmacy?.isVerified) {
    return NextResponse.json(
      { message: "Only verified pharmacies can reply." },
      { status: 403 }
    );
  }
  const { id: topicId } = await params;
  const topic = await prisma.forumTopic.findUnique({ where: { id: topicId } });
  if (!topic) return NextResponse.json({ message: "Topic not found" }, { status: 404 });
  try {
    const body = await req.json();
    const parsed = createReplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const reply = await prisma.forumReply.create({
      data: {
        topicId,
        authorId: (session.user as { id: string }).id,
        content: parsed.data.content,
      },
      include: {
        author: { select: { id: true, name: true, isVerified: true, state: true } },
      },
    });
    await prisma.forumTopic.update({
      where: { id: topicId },
      data: { updatedAt: new Date() },
    });
    return NextResponse.json(reply);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to post reply" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  const topic = await prisma.forumTopic.findUnique({ where: { id } });
  if (!topic) return NextResponse.json({ message: "Topic not found" }, { status: 404 });
  if (topic.authorId !== userId) {
    return NextResponse.json({ message: "You can only delete your own topics." }, { status: 403 });
  }
  await prisma.forumTopic.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
