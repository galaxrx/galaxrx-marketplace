import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TopicPageClient from "@/components/forum/TopicPageClient";

export const dynamic = "force-dynamic";

export default async function ForumTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

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

  if (!topic) notFound();

  const currentUserId = (session.user as { id: string }).id;

  return (
    <TopicPageClient
      currentUserId={currentUserId}
      topic={{
        id: topic.id,
        title: topic.title,
        body: topic.body,
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
        author: topic.author,
        replies: topic.replies.map((r) => ({
          id: r.id,
          content: r.content,
          createdAt: r.createdAt.toISOString(),
          author: r.author,
        })),
      }}
    />
  );
}
