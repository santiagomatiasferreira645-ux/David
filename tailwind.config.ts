import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Paleta de consola técnica: fondo azul noche, paneles apenas más claros y acento cian.
      // Amarillo y verde claros son los colores de SPES Supplier: solo en detalles, nunca de fondo.
      colors: {
        fondo: "#070b14",
        panel: "#0d1422",
        panel2: "#121b2d",
        borde: "#1e2a40",
        acento: "#22d3ee",
        amarillo: "#fde047",
        verde: "#bef264",
        texto: "#e2e8f0",
        apagado: "#8392ab",
      },
      fontFamily: {
        sans: ["var(--fuente-sans)", "system-ui", "sans-serif"],
        mono: ["var(--fuente-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
