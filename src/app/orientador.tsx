"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buscarAcciones } from "@/lib/modulos";
import { IconoModulo } from "./icono-modulo";

// Un PN tiene al menos un número y no lleva espacios (8N-7005, 1234567).
const pareceUnPn = (t: string) => /\d/.test(t) && !/\s/.test(t.trim()) && t.trim().length >= 3;

// "¿Qué necesitás hacer?": se escribe lo que se quiere hacer (precio, proveedor, catálogo…) y aparecen los
// atajos de cada módulo. Si lo escrito parece un PN, el primer resultado es buscarlo en Repuestos.
export function Orientador() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const limpio = texto.trim();
  const acciones = buscarAcciones(limpio).slice(0, 6);
  const pn = pareceUnPn(limpio) ? limpio.toUpperCase() : null;
  const destinos = [...(pn ? [`/buscar?pn=${encodeURIComponent(pn)}`] : []), ...acciones.map((a) => a.accion.href)];

  function ir(e: React.FormEvent) {
    e.preventDefault();
    if (destinos[0]) router.push(destinos[0]);
  }

  return (
    <form onSubmit={ir} className="space-y-2">
      <label className="etiqueta" htmlFor="orientador">
        Escribí qué buscás o un PN
      </label>
      <input
        id="orientador"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Precio, proveedor, catálogo, 8N-7005…"
        className="campo"
        autoComplete="off"
        enterKeyHint="go"
      />
      {limpio && (
        <ul className="divide-y divide-borde/60 overflow-hidden rounded-md border border-borde">
          {pn && (
            <li>
              <Link href={destinos[0]} className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-panel2">
                <span className="text-acento" aria-hidden>
                  ⌕
                </span>
                <span>
                  Buscar el PN <span className="pn font-semibold text-white">{pn}</span> en Repuestos
                </span>
              </Link>
            </li>
          )}
          {acciones.map(({ modulo, accion }) => (
            <li key={`${modulo.id}${accion.href}`}>
              <Link href={accion.href} className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-panel2">
                <span className={modulo.color.texto}>
                  <IconoModulo modulo={modulo} className="h-4 w-4" />
                </span>
                <span className="flex-1 text-texto">{accion.texto}</span>
                <span className="font-mono text-[11px] uppercase tracking-wider secundario">{modulo.nombre}</span>
              </Link>
            </li>
          ))}
          {!pn && acciones.length === 0 && <li className="px-3 py-2.5 text-sm secundario">No encontré nada con eso. Elegí un módulo abajo.</li>}
        </ul>
      )}
    </form>
  );
}
