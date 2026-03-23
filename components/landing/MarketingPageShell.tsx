import dynamic from "next/dynamic";

const HeroWallpaper = dynamic(
  () => import("@/components/landing/HeroWallpaper").then((m) => m.default),
  { ssr: true }
);

const LandingHeader = dynamic(
  () => import("@/components/landing/LandingHeader").then((m) => m.default),
  { ssr: true }
);

/**
 * Same top treatment as the home page: calm hero backdrop + full landing nav.
 * Use for About, Solutions, Why GalaxRX, and related marketing routes.
 */
export default function MarketingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-hidden text-white">
      <div className="relative border-b border-white/[0.06]">
        <HeroWallpaper className="z-0" variant="calm" />
        <LandingHeader />
      </div>
      <div className="flex flex-1 flex-col bg-[#0D1B2A]">{children}</div>
    </div>
  );
}
