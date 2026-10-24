import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Menu } from "./menu";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--fuente-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--fuente-mono" });

export const metadata: Metadata = {
  title: "Buscador de repuestos",
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
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-acento" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
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
