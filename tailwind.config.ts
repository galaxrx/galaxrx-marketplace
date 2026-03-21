import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#C9A84C",
        accent: "#A18241",
        "dark-nav": "#0D1B2A",
        surface: "#F4F9FF",
        error: "#E53935",
        warning: "#FF8C00",
        success: "#2E7D32",
        "text-primary": "#1A1A2E",
        "text-muted": "#6B7280",
        gold: "#C9A84C",
        "gold-muted": "#A18241",
        "mid-navy": "#0F2035",
        "deep-navy": "#091422",
        "footer-bg": "#070F18",
      },
      fontFamily: {
        heading: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        card: "8px",
        button: "6px",
      },
      spacing: {
        grid: "8px",
      },
      maxWidth: {
        /** Full-bleed layout width; sections rely on horizontal padding for gutters */
        "content-wide": "100%",
        content: "100%",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
