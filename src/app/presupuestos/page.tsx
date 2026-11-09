import Link from "next/link";
import { buscarItems } from "@/lib/presupuestos-datos";
import { agruparEnCarpetas, simplificar, type Carpeta } from "@/lib/presupuestos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { ListaPresupuestos, type FilaLista } from "./lista";
import { TarjetaPrecio } from "./precios";

type Params = { q?: string; clase?: string; tipo?: string; carpeta?: string; todos?: string };
type Fila = FilaLista;

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

const claveDe = (p: Fila) => simplificar((p.tipo === "proveedor" ? p.proveedor_nombre : p.cliente)?.trim() || "Sin nombre") || "sin nombre";

// Precios de referencia: lo que presupuestamos a clientes y lo que nos presupuestaron, ordenado en una carpeta por
// cliente o proveedor. La búsqueda por PN o descripción recorre todas, o solo la carpeta abierta.
export default async function Presupuestos({ searchParams }: { searchParams: Params }) {
  const q = searchParams.q?.trim() ?? "";
  const filtros = { clase: searchParams.clase ?? "", tipo: searchParams.tipo ?? "", carpeta: searchParams.carpeta ?? "" };
  const { data } = await clienteServidor()
    .from("presupuestos")
    .select("id, tipo, fecha, numero, cliente, proveedor_nombre, nombre_archivo, estado, error, presupuesto_items(count)")
    .order("fecha", { ascending: false, nullsFirst: false })
    .limit(5000);
  const todos = (data ?? []) as Fila[];
  const leidos = todos.filter((p) => p.estado === "listo");
  const pendientes = todos.filter((p) => p.estado !== "listo");

  // Carpeta abierta: "propio|naviera sur".
  const [tipoCarpeta, claveCarpeta] = filtros.carpeta.split("|");
  const enCarpeta = filtros.carpeta ? leidos.filter((p) => (p.tipo === "proveedor" ? "proveedor" : "propio") === tipoCarpeta && claveDe(p) === claveCarpeta) : null;
  const carpetas = agruparEnCarpetas(leidos);
  const abierta = filtros.carpeta ? carpetas.find((c) => `${c.tipo}|${c.clave}` === filtros.carpeta) : null;

  const items = q ? await buscarItems({ q, clase: filtros.clase, tipo: filtros.tipo, ids: enCarpeta?.map((p) => p.id) }) : [];
  const enlace = (cambio: Partial<Params>) => {
    const s = new URLSearchParams(Object.entries({ q, ...filtros, ...cambio }).filter(([, v]) => v) as [string, string][]);
    return `/presupuestos?${s}`;
  };

  return (
    <div className="space-y-4">
      <form className="tarjeta space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="subtitulo text-amarillo">Presupuestos · {todos.length} cargados</p>
            <h1 className="titulo mt-1 break-words">{abierta ? abierta.nombre : "Precio de referencia"}</h1>
            {abierta && (
              <Link href={enlace({ carpeta: "", q: "" })} className="enlace text-sm">
                ← Todas las carpetas
              </Link>
            )}
          </div>
          <Link href="/presupuestos/cargar" className="boton shrink-0">
            + Cargar
          </Link>
        </div>
        <div className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder={abierta ? `Buscar en ${abierta.nombre}...` : "PN, repuesto, servicio, motor, cliente..."}
            className="campo"
            autoCapitalize="none"
            enterKeyHint="search"
          />
          {Object.entries(filtros).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
          <button className="boton shrink-0">Buscar</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CLASES.map((c) => (
            <Link key={c.valor} href={enlace({ clase: c.valor })} className={`chip ${filtros.clase === c.valor ? "border-acento/50 bg-acento/10 text-acento" : "border-borde text-apagado"}`}>
              {c.texto}
            </Link>
          ))}
          {!abierta && (
            <>
              <span className="w-2" />
              {TIPOS.map((t) => (
                <Link key={t.valor} href={enlace({ tipo: t.valor })} className={`chip ${filtros.tipo === t.valor ? "border-acento/50 bg-acento/10 text-acento" : "border-borde text-apagado"}`}>
                  {t.texto}
                </Link>
              ))}
            </>
          )}
        </div>
      </form>

      {q ? (
        <>
          <p className="subtitulo">
            {items.length} {items.length === 1 ? "renglón" : "renglones"} con “{q}”{abierta && ` en ${abierta.nombre}`}
            {items.length === 300 && " (se muestran los primeros 300)"}
          </p>
          <ul className="space-y-2">
            {items.map((i) => (
              <TarjetaPrecio key={i.id} item={i} />
            ))}
            {items.length === 0 && <li className="tarjeta secundario">No hay nada presupuestado con ese texto.</li>}
          </ul>
        </>
      ) : searchParams.todos ? (
        <>
          <Link href="/presupuestos" className="enlace text-sm">
            ← Volver a las carpetas
          </Link>
          <ListaPresupuestos titulo={`Todos · ${todos.length}`} lista={todos} />
        </>
      ) : enCarpeta ? (
        <ListaPresupuestos titulo={`${enCarpeta.length} presupuestos`} lista={enCarpeta} />
      ) : (
        <>
          {(["propio", "proveedor"] as const)
            .filter((t) => !filtros.tipo || filtros.tipo === t)
            .map((t) => (
              <Carpetas key={t} titulo={t === "propio" ? "Clientes" : "Proveedores"} carpetas={carpetas.filter((c) => c.tipo === t)} enlace={(c) => enlace({ carpeta: `${c.tipo}|${c.clave}` })} />
            ))}
          {pendientes.length > 0 && <ListaPresupuestos titulo="Sin leer, con error o que no son presupuestos" lista={pendientes} />}
          {todos.length > 0 && (
            <Link href="/presupuestos?todos=1" className="enlace inline-block text-sm">
              Ver todos en una lista, para borrar varios juntos →
            </Link>
          )}
          {todos.length === 0 && (
            <p className="tarjeta text-sm secundario">
              Todavía no hay presupuestos. <Link href="/presupuestos/cargar" className="enlace">Cargá los primeros</Link>.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Carpetas({ titulo, carpetas, enlace }: { titulo: string; carpetas: Carpeta[]; enlace: (c: Carpeta) => string }) {
  if (!carpetas.length) return null;
  return (
    <section>
      <p className="subtitulo mb-2">
        {titulo} · {carpetas.length}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {carpetas.map((c) => (
          <li key={c.clave}>
            <Link href={enlace(c)} className="tarjeta flex items-center gap-3 p-3 transition hover:border-acento/60">
              <svg viewBox="0 0 24 24" className={`h-6 w-6 shrink-0 ${c.tipo === "proveedor" ? "text-cyan-300" : "text-amarillo"}`} fill="currentColor" aria-hidden>
                <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" opacity="0.85" />
              </svg>
              <span className="min-w-0">
                <span className="block truncate text-white">{c.nombre}</span>
                <span className="font-mono text-xs secundario">
                  {c.cantidad} {c.cantidad === 1 ? "presupuesto" : "presupuestos"}
                  {c.ultimaFecha && ` · último ${c.ultimaFecha}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
