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
        background: "var(--page-bg)",
        foreground: "var(--text-primary)",
        brand: { DEFAULT: "#2A6AF1", hover: "#2563EB", pressed: "#0F4CD3" },
        navy: { DEFAULT: "#0E254B", deep: "#031335" },
        slate: "#5A6884",
        border: "#DADDE2",
        danger: "#DC2626",
        warning: "#EC700A",
        info: "#1BBCE4",
        violet: "#7034EA",
      },
    },
  },
  plugins: [],
};
export default config;
