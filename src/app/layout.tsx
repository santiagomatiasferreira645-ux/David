import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Menu } from "./menu";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--fuente-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--fuente-mono" });

export const metadata: Metadata = {
  title: "BUSCADOR DE REPUESTOS",
  appleWebApp: { title: "BUSCADOR DE REPUESTOS" },
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
              <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
                <g className="fill-acento">
                  <rect x="29" y="5" width="6" height="8" rx="1" transform="rotate(0 32 32)" />
                  <rect x="29" y="5" width="6" height="8" rx="1" transform="rotate(45 32 32)" />
                  <rect x="29" y="5" width="6" height="8" rx="1" transform="rotate(90 32 32)" />
                  <rect x="29" y="5" width="6" height="8" rx="1" transform="rotate(135 32 32)" />
                  <rect x="29" y="5" width="6" height="8" rx="1" transform="rotate(180 32 32)" />
                  <rect x="29" y="5" width="6" height="8" rx="1" transform="rotate(225 32 32)" />
                  <rect x="29" y="5" width="6" height="8" rx="1" transform="rotate(270 32 32)" />
                  <rect x="29" y="5" width="6" height="8" rx="1" transform="rotate(315 32 32)" />
                </g>
                <circle cx="32" cy="32" r="21" fill="none" className="stroke-acento" strokeWidth="4" />
                <g fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                  <circle cx="32" cy="19.5" r="3" />
                  <path d="M32 22.5v22M25 28h14M20.5 36.5c2 6 6.5 8.5 11.5 8.5s9.5-2.5 11.5-8.5" />
                  <path d="M18.5 39l2-3 3 2M45.5 39l-2-3-3 2" />
                </g>
              </svg>
              <span className="font-mono text-sm font-semibold uppercase tracking-[0.12em] text-white sm:tracking-[0.2em]">
                Buscador de repuestos<span className="text-acento">.</span>
              </span>
            </Link>
            <Menu />
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 border-t border-borde pt-6 opacity-60">
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
