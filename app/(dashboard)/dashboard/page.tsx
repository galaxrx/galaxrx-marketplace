import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardStats from "./_components/DashboardStats";
import DashboardOrders from "./_components/DashboardOrders";
import DashboardMessages from "./_components/DashboardMessages";
import DashboardNegotiations from "./_components/DashboardNegotiations";
import DashboardAcceptedOffers from "./_components/DashboardAcceptedOffers";
import DashboardWantedMatches from "./_components/DashboardWantedMatches";

function StatsFallback() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5 animate-pulse">
          <div className="h-4 w-24 bg-white/10 rounded mb-2" />
          <div className="h-8 w-12 bg-white/15 rounded" />
        </div>
      ))}
    </div>
  );
}

function OrdersFallback() {
  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5 animate-pulse">
      <div className="h-5 w-32 bg-white/10 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function MessagesFallback() {
  return (
    <div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5 animate-pulse">
      <div className="h-5 w-36 bg-white/10 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const pharmacyId = (session?.user as { id?: string })?.id;
  if (!pharmacyId) redirect("/login");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold text-gold">Dashboard</h1>

      <div>
        <DashboardNegotiations />
      </div>

      <Suspense fallback={<StatsFallback />}>
        <DashboardStats pharmacyId={pharmacyId} />
      </Suspense>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/sell"
          className="bg-gradient-to-r from-gold-muted to-gold text-[#0D1B2A] px-6 py-3 rounded-xl font-bold hover:opacity-90 transition"
        >
          + List a Product
        </Link>
        <Link
          href="/buy"
          className="border-2 border-gold/50 text-gold px-6 py-3 rounded-xl font-medium hover:bg-gold/10 transition"
        >
          Buy Stock
        </Link>
        <Link
          href="/account"
          className="border-2 border-white/30 text-white/90 px-6 py-3 rounded-xl font-medium hover:bg-white/10 transition"
        >
          My Account
        </Link>
      </div>

      <Suspense fallback={<div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5 h-24 animate-pulse" />}>
        <DashboardAcceptedOffers />
      </Suspense>

      <Suspense fallback={<div className="bg-mid-navy border border-[rgba(161,130,65,0.18)] rounded-xl p-5 h-24 animate-pulse" />}>
        <DashboardWantedMatches pharmacyId={pharmacyId} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<OrdersFallback />}>
          <DashboardOrders pharmacyId={pharmacyId} />
        </Suspense>
        <Suspense fallback={<MessagesFallback />}>
          <DashboardMessages pharmacyId={pharmacyId} />
        </Suspense>
      </div>
    </div>
  );
}
