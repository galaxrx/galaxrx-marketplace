"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "galaxrx-app-theme";

export type AppTheme = "dark" | "light";

const AppThemeContext = createContext<{
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}>({ theme: "dark", setTheme: () => {} });

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  return ctx ?? { theme: "dark" as const, setTheme: () => {} };
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    if (stored === "light" || stored === "dark") setThemeState(stored);
    setMounted(true);
  }, []);

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, t);
  };

  const themeClass = mounted && theme === "light" ? "app-theme app-light" : "app-theme";

  return (
    <AppThemeContext.Provider value={{ theme, setTheme }}>
      <div className={themeClass}>{children}</div>
    </AppThemeContext.Provider>
  );
}
