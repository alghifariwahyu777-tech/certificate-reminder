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
          DEFAULT: "#15202E",
          light: "#253447",
          50: "#F1F5F9",
        },
        paper: "#F2F4F7",
        line: "#E3E8EF",
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
          DEFAULT: "#1671B8",
          light: "#2B86CF",
        },
        brand: {
          blue: "#1671B8",
          blueDark: "#123F6B",
          teal: "#0EA89B",
        },
        signal: {
          active: "#2F855A",
          activeBg: "#EAF5EE",
          activeBorder: "#C6E6D2",
          activeBar: "#2F855A",
          soon: "#B7791F",
          soonBg: "#FBF3E4",
          soonBorder: "#F0DDB5",
          soonBar: "#D69E2E",
          expired: "#C2362F",
          expiredBg: "#FBEDEC",
          expiredBorder: "#F2CBC8",
          expiredBar: "#C2362F",
          none: "#DDE3EA",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16, 24, 40, 0.04)",
        panel: "0 4px 12px -2px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
