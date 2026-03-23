import { AppThemeProvider } from "@/components/providers/AppThemeProvider";

export default function ListingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider>
      <div className="app-theme-inner min-h-screen w-full">{children}</div>
    </AppThemeProvider>
  );
}
