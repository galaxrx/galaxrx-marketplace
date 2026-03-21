import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import ThreadList from "@/components/messages/ThreadList";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] border border-[rgba(161,130,65,0.2)] rounded-xl overflow-hidden bg-[#0F2035]">
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[rgba(161,130,65,0.2)] flex-shrink-0 flex flex-col bg-[#0F2035]">
        <div className="p-4 border-b border-[rgba(161,130,65,0.2)] bg-[#0F2035]">
          <h1 className="text-lg font-heading font-bold text-gold">
            Messages
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#0F2035]">
          <ClientOnly fallback={<div className="p-4 text-white/50 text-sm">Loading…</div>}>
            <ThreadList />
          </ClientOnly>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-0 bg-[#0D1B2A]">{children}</main>
    </div>
  );
}
