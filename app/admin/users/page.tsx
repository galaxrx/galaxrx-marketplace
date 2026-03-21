import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import UserDeleteButton from "@/components/admin/UserDeleteButton";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const pharmacies = await prisma.pharmacy.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      abn: true,
      isVerified: true,
      role: true,
      tradeCount: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gold mb-6">
        All pharmacies
      </h1>
      {pharmacies.length === 0 ? (
        <p className="text-white/70">No pharmacies.</p>
      ) : (
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-white/90">Name</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Email</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">ABN</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Verified</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Trades</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Joined</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pharmacies.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 text-white/90">{p.name}</td>
                  <td className="p-3 text-white/80">{p.email}</td>
                  <td className="p-3 text-white/80">{p.abn}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        p.isVerified ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                      }`}
                    >
                      {p.isVerified ? "Yes" : "Pending"}
                    </span>
                  </td>
                  <td className="p-3 text-white/90">{p.tradeCount}</td>
                  <td className="p-3 text-white/80">{format(new Date(p.createdAt), "dd MMM yyyy")}</td>
                  <td className="p-3">
                    <UserDeleteButton
                      userId={p.id}
                      userName={p.name}
                      userEmail={p.email}
                      isAdmin={p.role === "ADMIN"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
