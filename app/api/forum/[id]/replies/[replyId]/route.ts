import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; replyId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id: topicId, replyId } = await params;
  const reply = await prisma.forumReply.findFirst({
    where: { id: replyId, topicId },
  });
  if (!reply) return NextResponse.json({ message: "Reply not found" }, { status: 404 });
  if (reply.authorId !== userId) {
    return NextResponse.json({ message: "You can only delete your own replies." }, { status: 403 });
  }
  await prisma.forumReply.delete({ where: { id: replyId } });
  await prisma.forumTopic.update({
    where: { id: topicId },
    data: { updatedAt: new Date() },
  });
  return new NextResponse(null, { status: 204 });
}
