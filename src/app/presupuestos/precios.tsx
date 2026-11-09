import Link from "next/link";
import type { ItemConPresupuesto } from "@/lib/presupuestos-datos";

export const TIPO_COLOR = {
  propio: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  proveedor: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
} as const;

export function TipoChip({ tipo }: { tipo: "propio" | "proveedor" | null }) {
  if (!tipo) return null;
  return <span className={`chip ${TIPO_COLOR[tipo]}`}>{tipo === "propio" ? "Nuestro" : "Proveedor"}</span>;
}

export function precioTexto(valor: number | null, moneda: string | null): string {
  if (valor == null) return "sin precio";
  return `${valor.toLocaleString("es", { maximumFractionDigits: 2 })} ${moneda ?? ""}`.trim();
}

// Un renglón presupuestado, pensado para leerse rápido en el celular: precio grande, quién y cuándo.
export function TarjetaPrecio({ item }: { item: ItemConPresupuesto }) {
  const p = item.presupuestos;
  const quien = p?.tipo === "proveedor" ? p.proveedor_nombre : p?.cliente;
  return (
    <li className="tarjeta relative overflow-hidden p-4 pl-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${p?.tipo === "proveedor" ? "bg-cyan-400" : "bg-emerald-400"}`} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.pn && <span className="pn text-base font-semibold text-white">{item.pn}</span>}
            {item.marca && <span className="font-mono text-sm text-acento">{item.marca}</span>}
            {item.clase === "servicio" && <span className="chip border-amber-400/40 bg-amber-400/10 text-amber-300">Servicio</span>}
          </div>
          <p className="text-sm text-slate-300">{item.descripcion}</p>
          {item.modelo_motor && <p className="text-xs secundario">{item.modelo_motor}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-mono text-lg font-semibold ${item.precio_unitario == null ? "secundario" : "text-emerald-300"}`}>{precioTexto(item.precio_unitario, item.moneda)}</p>
          <p className="font-mono text-xs secundario">
            {item.cantidad != null && `x ${item.cantidad.toLocaleString("es")}${item.unidad ? ` ${item.unidad}` : ""}`}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-borde/60 pt-2 text-xs">
        <TipoChip tipo={p?.tipo ?? null} />
        <span className="mr-auto secundario">
          {[p?.fecha, quien, p?.numero && `N° ${p.numero}`].filter(Boolean).join(" · ") || "sin datos"}
        </span>
        {p && (
          <Link href={`/presupuestos/${p.id}`} className="enlace">
            Ver presupuesto
          </Link>
        )}
      </div>
      {item.notas && <p className="mt-1 text-xs secundario">{item.notas}</p>}
    </li>
  );
}
