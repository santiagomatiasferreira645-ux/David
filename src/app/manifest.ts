import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio" en el celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BUSCADOR DE REPUESTOS",
    short_name: "BUSCADOR DE REPUESTOS",
    start_url: "/",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#070b14",
    icons: [{ src: "/icono.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
