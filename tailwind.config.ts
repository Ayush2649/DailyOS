import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        status: {
          success: "var(--success)",
          warning: "var(--warning)",
          danger: "var(--danger)",
          info: "var(--info)",
        },
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-hover)",
          dark: "var(--accent)",
          amber: "var(--accent-2)",
        },
        surface: {
          DEFAULT: "var(--surface-0)",
          page: "var(--surface-page)",
          base: "var(--surface-base)",
          raised: "var(--surface-raised)",
          inset: "var(--surface-inset)",
          secondary: "var(--surface-1)",
          tertiary: "var(--surface-2)",
        },
      },
      spacing: {
        "page-x": "var(--space-4)",
        "section-y": "var(--space-8)",
        "control-gap": "var(--space-2)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        display: ["var(--font-dm-sans)", "sans-serif"],
      },
      fontWeight: {
        black: "700",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        "card-hover": "var(--shadow-raised)",
        modal: "var(--shadow-dialog)",
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        pill: "var(--radius-pill)",
        xl: "0.5rem",
        "2xl": "0.625rem",
        "3xl": "0.75rem",
      },
      animation: {
        "fade-in": "fadeIn 0.14s ease-out",
        "slide-up": "fadeIn 0.14s ease-out",
        "scale-in": "fadeIn 0.14s ease-out",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        scaleIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
    },
  },
  plugins: [],
  safelist: [],
};
export default config;
