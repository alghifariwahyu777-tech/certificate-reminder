import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F172A",
          light: "#1E293B",
          50: "#F1F5F9",
        },
        paper: "#F7F7F4",
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#0B1120",
        },
        accent: {
          DEFAULT: "#1D4ED8",
          light: "#3B82F6",
        },
        brand: {
          blue: "#1671B8",
          blueDark: "#123F6B",
          teal: "#0EA89B",
        },
        signal: {
          active: "#15803D",
          activeBg: "#ECFDF3",
          activeBorder: "#BBF7D0",
          soon: "#B45309",
          soonBg: "#FFFBEB",
          soonBorder: "#FDE68A",
          expired: "#B91C1C",
          expiredBg: "#FEF2F2",
          expiredBorder: "#FECACA",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.06), 0 1px 3px 0 rgba(15, 23, 42, 0.08)",
        panel: "0 4px 12px -2px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
