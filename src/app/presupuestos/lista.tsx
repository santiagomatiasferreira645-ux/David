"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Presupuesto } from "@/lib/presupuestos";
import { borrarPresupuestos } from "./acciones";
import { TipoChip } from "./precios";

export type FilaLista = Pick<Presupuesto, "id" | "tipo" | "fecha" | "numero" | "cliente" | "proveedor_nombre" | "nombre_archivo" | "estado" | "error"> & {
  presupuesto_items: { count: number }[];
};

// Lista de presupuestos con tildes para borrar de a uno o varios juntos.
export function ListaPresupuestos({ titulo, lista }: { titulo: string; lista: FilaLista[] }) {
  const router = useRouter();
  const [tildados, setTildados] = useState<Set<number>>(new Set());
  const [borrando, iniciar] = useTransition();
  const [mensaje, setMensaje] = useState("");

  const cambiar = (id: number, si: boolean) =>
    setTildados((t) => {
      const n = new Set(t);
      if (si) n.add(id);
      else n.delete(id);
      return n;
    });

  function borrar(ids: number[]) {
    if (!ids.length) return;
    const texto = ids.length === 1 ? "¿Borrar este presupuesto, su archivo y sus renglones?" : `¿Borrar ${ids.length} presupuestos, con sus archivos y renglones?`;
    if (!confirm(texto)) return;
    iniciar(async () => {
      const r = await borrarPresupuestos(ids);
      setMensaje(r.error ? `Se borraron ${r.borrados}; hubo un error: ${r.error}` : `Se ${r.borrados === 1 ? "borró 1 presupuesto" : `borraron ${r.borrados} presupuestos`}.`);
      setTildados(new Set());
      router.refresh();
    });
  }

  return (
    <section className="tarjeta">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="subtitulo mr-auto">{titulo}</p>
        {lista.length > 1 && (
          <>
            <button type="button" className="enlace text-sm" onClick={() => setTildados(new Set(lista.map((p) => p.id)))} disabled={borrando}>
              Tildar todos
            </button>
            <button type="button" className="enlace text-sm" onClick={() => setTildados(new Set())} disabled={borrando}>
              Ninguno
            </button>
          </>
        )}
        {tildados.size > 0 && (
          <button type="button" onClick={() => borrar([...tildados])} disabled={borrando} className="chip border-red-400/40 bg-red-400/10 text-red-300">
            {borrando ? "Borrando..." : `Borrar ${tildados.size} tildados`}
          </button>
        )}
      </div>
      {mensaje && <p className="mb-2 text-sm text-emerald-300">{mensaje}</p>}
      <ul className="divide-y divide-borde/60">
        {lista.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2.5">
            <input
              type="checkbox"
              checked={tildados.has(p.id)}
              onChange={(e) => cambiar(p.id, e.target.checked)}
              disabled={borrando}
              className="h-5 w-5 shrink-0 accent-red-400"
              aria-label="Tildar para borrar"
            />
            <Link href={`/presupuestos/${p.id}`} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 hover:text-acento">
              <span className="mr-auto min-w-0">
                <span className="block break-words text-white">{p.numero ? `N° ${p.numero}` : (p.nombre_archivo?.split("/").pop() ?? `#${p.id}`)}</span>
                <span className="font-mono text-xs secundario">
                  {[p.fecha, (p.tipo === "proveedor" ? p.proveedor_nombre : p.cliente) ?? null, `${p.presupuesto_items[0]?.count ?? 0} renglones`].filter(Boolean).join(" · ")}
                </span>
                {p.estado !== "listo" && p.error && <span className="block text-xs text-red-300/80">{p.error.slice(0, 160)}</span>}
              </span>
              {p.estado === "listo" ? (
                <TipoChip tipo={p.tipo} />
              ) : (
                <span className={`chip ${p.estado === "error" ? "border-red-400/40 text-red-300" : "border-amber-400/40 text-amber-300"}`}>{p.estado === "error" ? "error" : "sin leer"}</span>
              )}
            </Link>
            <button type="button" onClick={() => borrar([p.id])} disabled={borrando} title="Borrar" aria-label="Borrar" className="shrink-0 p-1 text-apagado hover:text-red-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
