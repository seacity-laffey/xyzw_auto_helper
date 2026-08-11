/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/views/TokenImport/index.vue",
    "./src/views/BatchDailyTasks.vue",
  ],
  important: "#app",
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        surface: "var(--surface)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        outline: "var(--outline)",
        "outline-variant": "var(--outline-variant)",
        primary: "var(--primary)",
        "on-primary": "var(--on-primary)",
        secondary: "var(--secondary)",
        tertiary: "var(--tertiary)",
        error: "var(--error)",
      },
      fontFamily: {
        sans: ["Hanken Grotesk", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
      },
      fontSize: {
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "1.4" }],
        "label-sm": ["12px", { lineHeight: "1", fontWeight: "600" }],
      },
      spacing: {
        "container-margin": "24px",
        gutter: "16px",
        "card-padding": "20px",
      },
    },
  },
  plugins: [],
};
