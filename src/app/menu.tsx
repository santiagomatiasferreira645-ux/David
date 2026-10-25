"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// En el celular los textos se acortan para que entre todo el menú sin tener que deslizar.
const MENU = [
  { href: "/", texto: "Buscar" },
  { href: "/historial", texto: "Historial" },
  { href: "/proveedores", texto: "Proveedores" },
  { href: "/cotizaciones/nueva", texto: "Cargar precio", corto: "Precio" },
];

export function Menu() {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/" ? ruta === "/" || ruta.startsWith("/buscar") : ruta.startsWith(href) || (href === "/proveedores" && ruta.startsWith("/repuestos"));
  const clase = (href: string) =>
    `whitespace-nowrap rounded-md px-2 py-1.5 sm:px-3 text-[13px] sm:text-sm font-medium transition ${
      activo(href) ? "bg-acento/10 text-acento ring-1 ring-inset ring-acento/30" : "text-apagado hover:text-texto"
    }`;
  return (
    <div className="flex w-full items-center justify-between gap-0.5 sm:w-auto sm:justify-start sm:gap-1">
      {MENU.map((m) => (
        <Link key={m.href} href={m.href} className={clase(m.href)}>
          {m.corto ? (
            <>
              <span className="sm:hidden">{m.corto}</span>
              <span className="hidden sm:inline">{m.texto}</span>
            </>
          ) : (
            m.texto
          )}
        </Link>
      ))}
      <Link href="/cuenta" title="Mi cuenta" aria-label="Mi cuenta" className={`${clase("/cuenta")} flex items-center`}>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      </Link>
    </div>
  );
}
