import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0b1220",
          soft: "#111a2e",
          line: "#1e2a44",
        },
        gov: {
          // neutral, non-partisan brand palette (slate + civic gold)
          50: "#f5f7fb",
          100: "#e8edf6",
          400: "#7f93b8",
          500: "#5a719c",
          600: "#3f5680",
          700: "#2c3e63",
        },
        gold: "#d9a441",
        good: "#3aa675",
        bad: "#d05a5a",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
