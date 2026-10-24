import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Menu } from "./menu";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--fuente-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--fuente-mono" });

export const metadata: Metadata = {
  title: "Buscador de repuestos",
  icons: { icon: "/icono.svg", apple: "/icono.svg" },
  description: "Búsqueda de repuestos navales por PN y marca, con historial de proveedores y cotizaciones.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#070b14" };

const GRUPO = [
  { src: "/logos/daysa.png", nombre: "DAYSA" },
  { src: "/logos/tecnica-naval.png", nombre: "Técnica Naval y Servicios" },
  { src: "/logos/spes.png", nombre: "SPES Supplier" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <header className="sticky top-0 z-10 border-b border-borde bg-fondo/85 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="mr-auto flex items-center gap-2">
              <svg viewBox="0 0 64 64" className="h-7 w-7 text-acento" aria-hidden>
                <g fill="currentColor">
                  <g transform="translate(27 27)">
                    <ellipse cy="-8.5" rx="4.3" ry="7.6" />
                    <ellipse cy="-8.5" rx="4.3" ry="7.6" transform="rotate(120)" />
                    <ellipse cy="-8.5" rx="4.3" ry="7.6" transform="rotate(240)" />
                  </g>
                  <circle cx="27" cy="27" r="3.4" className="fill-fondo" />
                  <circle cx="27" cy="27" r="1.8" />
                </g>
                <circle cx="27" cy="27" r="19" fill="none" stroke="currentColor" strokeWidth="3.6" />
                <path d="M41 41l15 15" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" />
              </svg>
              <span className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-white">
                Repuestos<span className="text-acento">.</span>
              </span>
            </Link>
            <Menu />
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-borde pt-6 opacity-40">
            {GRUPO.map((g) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={g.src} src={g.src} alt={g.nombre} title={g.nombre} className="h-12 w-auto" />
            ))}
          </div>
        </footer>
      </body>
    </html>
  );
}
