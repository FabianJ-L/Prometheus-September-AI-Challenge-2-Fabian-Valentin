import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // NOESIS is dark-first. Neutral instrument palette, minimal accent.
        ink: {
          900: "#0b0d10",
          800: "#12151a",
          700: "#1a1e25",
          600: "#242932",
          500: "#333a45",
        },
        line: "#2a2f38",
        muted: "#8b95a3",
        fg: "#e6e9ee",
        accent: {
          DEFAULT: "#5b9dff",
          soft: "#1e2c44",
        },
        ok: "#4ec98a",
        diverge: "#ff6b6b",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
