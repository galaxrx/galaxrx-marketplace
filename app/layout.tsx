import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Sora, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { CartProvider } from "@/components/providers/CartContext";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GalaxRX — The Smarter Way for Pharmacies to Trade",
  description:
    "List surplus stock in 10 seconds. Find what you need. Trade with verified pharmacies.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const PerformanceAudit = dynamic(
  () => import("@/components/profiling/PerformanceAudit").then((m) => m.default),
  { ssr: false }
);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionProvider session={session}>
          <CartProvider>{children}</CartProvider>
          <Toaster position="top-center" richColors />
          <PerformanceAudit />
        </SessionProvider>
      </body>
    </html>
  );
}
