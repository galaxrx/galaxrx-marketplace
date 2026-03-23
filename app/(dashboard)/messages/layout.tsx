import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import ThreadList from "@/components/messages/ThreadList";
import MessagesPaneLayout from "@/components/messages/MessagesPaneLayout";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <MessagesPaneLayout
      threadList={
        <ClientOnly fallback={<div className="p-4 text-white/50 text-sm">Loading…</div>}>
          <ThreadList />
        </ClientOnly>
      }
    >
      {children}
    </MessagesPaneLayout>
  );
}
