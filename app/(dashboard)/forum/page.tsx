import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ForumPageClient from "@/components/forum/ForumPageClient";

export const dynamic = "force-dynamic";

export default async function ForumPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const currentUserId = (session.user as { id: string }).id;

  return (
    <div className="w-full max-w-none">
      <ForumPageClient currentUserId={currentUserId} />
    </div>
  );
}
