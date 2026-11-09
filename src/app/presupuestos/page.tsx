import Link from "next/link";
import { buscarItems } from "@/lib/presupuestos-datos";
import type { Presupuesto } from "@/lib/presupuestos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { TarjetaPrecio, TipoChip } from "./precios";

type Params = { q?: string; clase?: string; tipo?: string };

const CLASES = [
  { valor: "", texto: "Todo" },
  { valor: "repuesto", texto: "Repuestos" },
  { valor: "servicio", texto: "Servicios" },
];
const TIPOS = [
  { valor: "", texto: "Todos" },
  { valor: "propio", texto: "Nuestros" },
  { valor: "proveedor", texto: "De proveedores" },
];

// Precios de referencia: lo que presupuestamos a clientes y lo que nos presupuestaron, buscado por PN o descripción.
export default async function Presupuestos({ searchParams }: { searchParams: Params }) {
  const q = searchParams.q?.trim() ?? "";
  const filtros = { clase: searchParams.clase ?? "", tipo: searchParams.tipo ?? "" };
  const supabase = clienteServidor();
  const [items, recientes, total] = await Promise.all([
    q ? buscarItems({ q, ...filtros }) : Promise.resolve([]),
    q
      ? Promise.resolve({ data: [] })
      : supabase.from("presupuestos").select("id, tipo, fecha, numero, cliente, proveedor_nombre, nombre_archivo, estado, error, presupuesto_items(count)").order("creado_en", { ascending: false }).limit(40),
    supabase.from("presupuestos").select("id", { count: "exact", head: true }),
  ]);
  const lista = (recientes.data ?? []) as (Presupuesto & { presupuesto_items: { count: number }[] })[];
  const enlace = (cambio: Partial<Params>) => {
    const s = new URLSearchParams(Object.entries({ q, ...filtros, ...cambio }).filter(([, v]) => v) as [string, string][]);
    return `/presupuestos?${s}`;
  };

  return (
    <div className="space-y-4">
      <form className="tarjeta space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="subtitulo text-amarillo">Presupuestos · {total.count ?? 0} cargados</p>
            <h1 className="titulo mt-1">Precio de referencia</h1>
          </div>
          <Link href="/presupuestos/cargar" className="boton shrink-0">
            + Cargar
          </Link>
        </div>
        <div className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="PN, repuesto, servicio, motor, cliente..." className="campo" autoCapitalize="none" enterKeyHint="search" />
          {filtros.clase && <input type="hidden" name="clase" value={filtros.clase} />}
          {filtros.tipo && <input type="hidden" name="tipo" value={filtros.tipo} />}
          <button className="boton shrink-0">Buscar</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CLASES.map((c) => (
            <Link key={c.valor} href={enlace({ clase: c.valor })} className={`chip ${filtros.clase === c.valor ? "border-acento/50 bg-acento/10 text-acento" : "border-borde text-apagado"}`}>
              {c.texto}
            </Link>
          ))}
          <span className="w-2" />
          {TIPOS.map((t) => (
            <Link key={t.valor} href={enlace({ tipo: t.valor })} className={`chip ${filtros.tipo === t.valor ? "border-acento/50 bg-acento/10 text-acento" : "border-borde text-apagado"}`}>
              {t.texto}
            </Link>
          ))}
        </div>
      </form>

      {q ? (
        <>
          <p className="subtitulo">
            {items.length} {items.length === 1 ? "renglón" : "renglones"} con “{q}”{items.length === 300 && " (se muestran los primeros 300)"}
          </p>
          <ul className="space-y-2">
            {items.map((i) => (
              <TarjetaPrecio key={i.id} item={i} />
            ))}
            {items.length === 0 && <li className="tarjeta secundario">No hay nada presupuestado con ese texto.</li>}
          </ul>
        </>
      ) : (
        <section className="tarjeta">
          <p className="subtitulo mb-2">Últimos cargados</p>
          <ul className="divide-y divide-borde/60">
            {lista.map((p) => (
              <li key={p.id}>
                <Link href={`/presupuestos/${p.id}`} className="flex flex-wrap items-center gap-2 py-2.5 hover:text-acento">
                  <span className="mr-auto min-w-0">
                    <span className="block text-white">{(p.tipo === "proveedor" ? p.proveedor_nombre : p.cliente) ?? p.nombre_archivo}</span>
                    <span className="font-mono text-xs secundario">
                      {[p.fecha, p.numero && `N° ${p.numero}`, `${p.presupuesto_items[0]?.count ?? 0} renglones`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {p.estado === "listo" ? <TipoChip tipo={p.tipo} /> : <span className={`chip ${p.estado === "error" ? "border-red-400/40 text-red-300" : "border-amber-400/40 text-amber-300"}`}>{p.estado === "error" ? "error" : "sin leer"}</span>}
                </Link>
              </li>
            ))}
            {lista.length === 0 && (
              <li className="py-2 text-sm secundario">
                Todavía no hay presupuestos. <Link href="/presupuestos/cargar" className="enlace">Cargá los primeros</Link>.
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
