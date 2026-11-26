import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio" en el celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BUSCADOR DE REPUESTOS",
    short_name: "BUSCADOR DE REPUESTOS",
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "es",
    display: "standalone",
    background_color: "#070b14",
    theme_color: "#070b14",
    // Los nombres llevan "v2" para que los celulares y la compu no usen
    // un ícono viejo guardado. Si se cambia el ícono, subir a v3.
    // Windows y Android necesitan PNG 192 y 512: con un SVG solo, el acceso
    // directo del escritorio queda sin ícono.
    icons: [
      { src: "/icono-v2-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-v2-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono-v2-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icono.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
