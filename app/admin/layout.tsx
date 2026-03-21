import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] p-6">
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <Link href="/dashboard" className="text-white/80 hover:text-white font-medium">Marketplace</Link>
        <Link href="/admin" className="text-gold font-medium hover:underline">Stats</Link>
        <Link href="/admin/verifications" className="text-gold font-medium hover:underline">Verifications</Link>
        <Link href="/admin/listings" className="text-gold font-medium hover:underline">Listings</Link>
        <Link href="/admin/users" className="text-gold font-medium hover:underline">Users</Link>
        <Link href="/admin/accountant" className="text-gold font-medium hover:underline">Accountant</Link>
        <Link href="/admin/transactions" className="text-gold font-medium hover:underline">Transactions</Link>
        <form action="/api/auth/signout" method="POST" className="ml-auto">
          <button type="submit" className="text-white/70 hover:text-white text-sm">
            Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
