import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--text)",
        accent: "var(--accent)",
        accent2: "var(--accent2)",
        surface: "var(--surface)",
        border: "var(--border)",
        muted: "var(--text2)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "Inter", "sans-serif"],
        heading: ["var(--font-heading)", "Fraunces", "serif"],
        accent: ["var(--font-accent)", "Instrument Serif", "serif"],
        display: ["var(--font-display)", "Space Grotesk", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
        pixel: ["var(--font-pixel)", "Press Start 2P", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
