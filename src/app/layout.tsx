import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Buscador de repuestos",
  description: "Búsqueda de repuestos navales por PN y marca, con historial de proveedores y cotizaciones.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1d4ed8" };

const MENU = [
  { href: "/", texto: "Buscar" },
  { href: "/historial", texto: "Historial" },
  { href: "/proveedores", texto: "Proveedores" },
  { href: "/cotizaciones/nueva", texto: "Cargar precio" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <Link href="/" className="mr-auto font-bold text-blue-800">
              Repuestos
            </Link>
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className="text-sm font-medium text-slate-700 hover:text-blue-700">
                {m.texto}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
