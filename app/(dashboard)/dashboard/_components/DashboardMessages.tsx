import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";

export default async function DashboardMessages({ pharmacyId }: { pharmacyId: string }) {
  const recentMessages = await prisma.message.findMany({
    where: { recipientId: pharmacyId },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { sender: { select: { name: true } } },
  });

  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-semibold text-lg text-white">Recent messages</h2>
        {recentMessages.length > 0 && (
          <Link href="/messages" className="text-sm text-gold hover:underline">
            View all
          </Link>
        )}
      </div>
      {recentMessages.length === 0 ? (
        <p className="text-white/60 text-sm">No messages yet.</p>
      ) : (
        <ul className="space-y-3">
          {recentMessages.map((m) => (
            <li key={m.id}>
              <Link
                href={`/messages/${m.threadId}`}
                className="block text-sm hover:bg-white/5 -mx-2 px-2 py-1.5 rounded-lg transition"
              >
                <span className="text-gold font-medium">{m.sender.name}</span>
                <span className="text-white/60"> — </span>
                <span className="text-white/80 line-clamp-1">{m.content}</span>
                <span className="block text-xs text-white/50 mt-0.5">
                  {format(new Date(m.createdAt), "d MMM, HH:mm")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
