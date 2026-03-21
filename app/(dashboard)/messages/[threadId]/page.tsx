import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MessageThread from "@/components/messages/MessageThread";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { threadId } = await params;
  return (
    <MessageThread
      threadId={threadId}
      currentUserId={(session.user as { id: string }).id}
    />
  );
}
