/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  important: "#app",
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        "border": "var(--border)",
        "input": "var(--input)",
        "ring": "var(--ring)",
        "background": "var(--background)",
        "foreground": "var(--foreground)",
        "card": {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        "popover": {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        "muted": {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        "accent": {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        "destructive": {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        "surface": "var(--surface)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        "outline": "var(--outline)",
        "outline-variant": "var(--outline-variant)",
        "primary": {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        "on-primary": "var(--on-primary)",
        "secondary": {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        "tertiary": "var(--tertiary)",
        "error": "var(--error)",
        "success": "var(--success)",
        "warning": "var(--warning)",
        "info": "var(--info)",
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
        "gutter": "16px",
        "card-padding": "20px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 2px)",
      },
    },
  },
  plugins: [],
};
