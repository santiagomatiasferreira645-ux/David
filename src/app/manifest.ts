import type { MetadataRoute } from "next";

// Permite instalar la app: "Agregar a pantalla de inicio" en el celular e "Instalar" en la compu.
// Windows y Chrome de escritorio no usan el SVG para el acceso directo, por eso van también los PNG.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BUSCADOR DE REPUESTOS",
    short_name: "BUSCADOR DE REPUESTOS",
    start_url: "/",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#070b14",
    icons: [
      { src: "/icono.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icono-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
