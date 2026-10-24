"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/", texto: "Buscar" },
  { href: "/historial", texto: "Historial" },
  { href: "/proveedores", texto: "Proveedores" },
  { href: "/cotizaciones/nueva", texto: "Cargar precio" },
];

export function Menu() {
  const ruta = usePathname();
  const activo = (href: string) => (href === "/" ? ruta === "/" || ruta.startsWith("/buscar") : ruta.startsWith(href));
  return (
    <div className="flex gap-1 overflow-x-auto">
      {MENU.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className={`whitespace-nowrap rounded-md px-2.5 py-1.5 sm:px-3 text-sm font-medium transition ${
            activo(m.href) ? "bg-acento/10 text-acento ring-1 ring-inset ring-acento/30" : "text-apagado hover:text-texto"
          }`}
        >
          {m.texto}
        </Link>
      ))}
    </div>
  );
}
