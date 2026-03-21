import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCachedPharmacyDisplay } from "@/lib/pharmacy-cache";

export const dynamic = "force-dynamic";
import Link from "next/link";
import Image from "next/image";
import DashboardNav from "@/components/dashboard/DashboardNav";
import DashboardSidebarShell from "@/components/dashboard/DashboardSidebarShell";
import PharmacyTopBar from "@/components/dashboard/PharmacyTopBar";
import ClientOnly from "@/components/ClientOnly";
import MobileBottomNav from "@/components/dashboard/MobileBottomNav";
import SessionChangeBanner from "@/components/dashboard/SessionChangeBanner";
import { AppThemeProvider } from "@/components/providers/AppThemeProvider";
import { UnreadCountProvider } from "@/components/dashboard/UnreadCountContext";

const headerFallback = (
  <header className="app-header sticky top-0 z-40 h-20 border-b flex items-center justify-end gap-4 px-4" />
);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  // Admins can use the marketplace too (sell, buy, etc.); they can reach /admin via the nav "Admin" link.
  // Unverified users must wait for admin approval
  if ((session.user as { isVerified?: boolean })?.isVerified !== true) {
    redirect("/pending");
  }

  const pharmacyId = (session.user as { id: string }).id;
  const userName = session.user?.name ?? "";
  const isAdmin = (session.user as { role?: string })?.role === "ADMIN";

  // Single cached pharmacy lookup for nav + top bar (avoids duplicate getServerSession + Prisma per nav)
  const pharmacy = await getCachedPharmacyDisplay(pharmacyId);

  return (
    <AppThemeProvider>
      <UnreadCountProvider>
      <DashboardSidebarShell
        sidebar={
          <>
            <Link
              href="/dashboard"
              className="h-20 px-4 border-b border-white/10 flex items-center justify-center flex-shrink-0 logo-link-dark"
            >
              <div className="relative h-16 w-full min-w-0 flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="GalaxRX"
                  fill
                  className="object-contain object-left"
                  sizes="208px"
                  priority
                />
              </div>
            </Link>
            <DashboardNav userName={userName} isAdmin={isAdmin} />
          </>
        }
      >
        <SessionChangeBanner />
        <div className="flex-1 flex flex-col min-h-screen md:ml-[var(--dashboard-sidebar-width)]">
        <Suspense fallback={headerFallback}>
          <PharmacyTopBar
            pharmacyName={pharmacy?.name ?? "Pharmacy"}
            pharmacyLogoUrl={pharmacy?.logoUrl ?? null}
          />
        </Suspense>
        <main className="flex-1 p-4 md:p-6 lg:px-8 xl:px-10 pb-20 md:pb-6">
          <Suspense fallback={<div className="flex items-center justify-center min-h-[200px] text-white/50">Loading…</div>}>
            {children}
          </Suspense>
        </main>
      </div>
      <ClientOnly fallback={null}>
        <MobileBottomNav />
      </ClientOnly>
      </DashboardSidebarShell>
      </UnreadCountProvider>
    </AppThemeProvider>
  );
}
