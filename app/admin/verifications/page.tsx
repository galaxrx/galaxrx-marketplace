import { prisma } from "@/lib/prisma";
import VerificationActions from "@/components/admin/VerificationActions";

export const dynamic = "force-dynamic";

export default async function AdminVerificationsPage() {
  const pharmacies = await prisma.pharmacy.findMany({
    where: { isVerified: false },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gold mb-2">
        New user verification
      </h1>
      <p className="text-white/70 text-sm mb-6">
        New sign-ups appear here. <strong>Approve</strong> to let them use the marketplace (list & buy). <strong>Reject</strong> to send them a reason — they stay unverified.
      </p>
      {pharmacies.length === 0 ? (
        <p className="text-white/70">No pending verifications.</p>
      ) : (
        <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-white/90">Pharmacy</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Email</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">ABN</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Submitted</th>
                <th className="text-left p-3 text-sm font-medium text-white/90">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {pharmacies.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 text-white/90">{p.name}</td>
                  <td className="p-3 text-white/80">{p.email}</td>
                  <td className="p-3 text-white/80">{p.abn}</td>
                  <td className="p-3 text-white/80">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <VerificationActions pharmacyId={p.id} />
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
