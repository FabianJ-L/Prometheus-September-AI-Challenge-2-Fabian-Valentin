import type { Config } from "tailwindcss";

/** Every colour is a CSS variable so the Appearance theme switch is real. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        raised: token("raised"),
        line: token("line"),
        "line-strong": token("line-strong"),
        fg: token("fg"),
        "fg-muted": token("fg-muted"),
        "fg-subtle": token("fg-subtle"),
        accent: token("accent"),
        "accent-fg": token("accent-fg"),
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        "code-keyword": token("code-keyword"),
        "code-string": token("code-string"),
        "code-number": token("code-number"),
        "code-builtin": token("code-builtin"),
        "code-func": token("code-func"),
        "code-comment": token("code-comment"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "14px",
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px", letterSpacing: "0.04em" }],
      },
      boxShadow: {
        panel: "0 1px 2px rgb(0 0 0 / 0.16)",
        raised: "0 4px 16px -4px rgb(0 0 0 / 0.28)",
        pop: "0 12px 32px -8px rgb(0 0 0 / 0.42)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "value-flash": {
          "0%": { backgroundColor: "rgb(var(--accent) / 0.22)" },
          "100%": { backgroundColor: "transparent" },
        },
        "bar-grow": { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: {
        "fade-up": "fade-up 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 180ms ease-out both",
        "value-flash": "value-flash 640ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
