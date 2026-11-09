"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { moduloDeRuta, seccionActiva } from "@/lib/modulos";
import { IconoModulo } from "./icono-modulo";

// Arriba se muestran solo las secciones del módulo en el que se está, con un botón para volver a los módulos.
// En el celular los textos se acortan y las secciones van en filas de tres, así entra todo sin deslizar.
export function Menu() {
  const ruta = usePathname();
  const modulo = moduloDeRuta(ruta);
  const activa = modulo ? seccionActiva(modulo, ruta) : null;
  const clase = (activo: boolean) =>
    `whitespace-nowrap rounded-md px-2 py-1.5 text-center sm:px-3 text-[13px] sm:text-sm font-medium transition ${
      activo ? "bg-acento/10 text-acento ring-1 ring-inset ring-acento/30" : "text-apagado hover:text-texto"
    }`;

  return (
    <>
      <Link href="/cuenta" title="Mi cuenta" aria-label="Mi cuenta" className={`${clase(ruta.startsWith("/cuenta"))} order-2 flex items-center sm:order-3`}>
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      </Link>
      {ruta !== "/" && (
        <div className="order-3 flex w-full flex-col gap-2 sm:order-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Link href="/" className="boton-secundario px-2.5 py-1.5" title="Volver a los módulos">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Módulos</span>
            </Link>
            {modulo && (
              <span className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] ${modulo.color.texto}`}>
                <IconoModulo modulo={modulo} className="h-4 w-4" />
                {modulo.nombre}
              </span>
            )}
          </div>
          {modulo && modulo.secciones.length > 1 && (
            <div className="grid grid-cols-3 gap-1 sm:flex sm:flex-wrap">
              {modulo.secciones.map((s) => (
                <Link key={s.href} href={s.href} className={clase(activa === s.href)}>
                  {s.corto ? (
                    <>
                      <span className="sm:hidden">{s.corto}</span>
                      <span className="hidden sm:inline">{s.texto}</span>
                    </>
                  ) : (
                    s.texto
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
