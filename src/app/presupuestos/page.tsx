import Link from "next/link";
import { buscarItems } from "@/lib/presupuestos-datos";
import { agruparEnCarpetas, agruparPorAnio, anioDe, simplificar, SIN_FECHA, type Carpeta } from "@/lib/presupuestos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { ListaPresupuestos, type FilaLista } from "./lista";
import { TarjetaPrecio } from "./precios";

type Params = { q?: string; clase?: string; tipo?: string; anio?: string; carpeta?: string; todos?: string };
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

// Precios de referencia: lo que presupuestamos a clientes y lo que nos presupuestaron, en cascada Año / Cliente (o
// proveedor) / Presupuesto. La búsqueda por PN o descripción recorre todo, o solo el año o la carpeta abiertos.
export default async function Presupuestos({ searchParams }: { searchParams: Params }) {
  const q = searchParams.q?.trim() ?? "";
  const filtros = { clase: searchParams.clase ?? "", tipo: searchParams.tipo ?? "", anio: searchParams.anio ?? "", carpeta: searchParams.carpeta ?? "" };
  const { data } = await clienteServidor()
    .from("presupuestos")
    .select("id, tipo, fecha, numero, cliente, proveedor_nombre, nombre_archivo, estado, error, presupuesto_items(count)")
    .order("fecha", { ascending: false, nullsFirst: false })
    .limit(5000);
  const todos = (data ?? []) as Fila[];
  const leidos = todos.filter((p) => p.estado === "listo");
  const pendientes = todos.filter((p) => p.estado !== "listo");

  // Año abierto ("2024" o "sin-fecha") y, dentro, carpeta abierta: "propio|naviera sur".
  const anios = agruparPorAnio(leidos);
  const enAnio = filtros.anio ? leidos.filter((p) => anioDe(p.fecha) === filtros.anio) : leidos;
  const [tipoCarpeta, claveCarpeta] = filtros.carpeta.split("|");
  const enCarpeta = filtros.carpeta ? enAnio.filter((p) => (p.tipo === "proveedor" ? "proveedor" : "propio") === tipoCarpeta && claveDe(p) === claveCarpeta) : null;
  const carpetas = agruparEnCarpetas(enAnio);
  const abierta = filtros.carpeta ? carpetas.find((c) => `${c.tipo}|${c.clave}` === filtros.carpeta) : null;
  const anioTexto = filtros.anio === SIN_FECHA ? "Sin fecha" : filtros.anio;
  const lugar = [anioTexto, abierta?.nombre].filter(Boolean).join(" · ");

  const items = q ? await buscarItems({ q, clase: filtros.clase, tipo: filtros.tipo, anio: filtros.anio, ids: enCarpeta?.map((p) => p.id) }) : [];
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
            <h1 className="titulo mt-1 break-words">{abierta?.nombre ?? (anioTexto ? `Año ${anioTexto}` : "Precio de referencia")}</h1>
            {filtros.anio && (
              <nav className="mt-1 flex flex-wrap gap-x-1.5 text-sm secundario">
                <Link href={enlace({ anio: "", carpeta: "", q: "" })} className="enlace">
                  Todos los años
                </Link>
                <span>›</span>
                {abierta ? (
                  <>
                    <Link href={enlace({ carpeta: "", q: "" })} className="enlace">
                      {anioTexto}
                    </Link>
                    <span>›</span>
                    <span className="break-words">{abierta.nombre}</span>
                  </>
                ) : (
                  <span>{anioTexto}</span>
                )}
              </nav>
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
            placeholder={lugar ? `Buscar en ${lugar}...` : "PN, repuesto, servicio, motor, cliente..."}
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
            {items.length} {items.length === 1 ? "renglón" : "renglones"} con “{q}”{lugar && ` en ${lugar}`}
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
      ) : filtros.anio ? (
        <>
          {(["propio", "proveedor"] as const)
            .filter((t) => !filtros.tipo || filtros.tipo === t)
            .map((t) => (
              <Carpetas key={t} titulo={t === "propio" ? "Clientes" : "Proveedores"} carpetas={carpetas.filter((c) => c.tipo === t)} enlace={(c) => enlace({ carpeta: `${c.tipo}|${c.clave}` })} />
            ))}
          {enAnio.length === 0 && <p className="tarjeta text-sm secundario">No hay presupuestos de {anioTexto}.</p>}
        </>
      ) : (
        <>
          {anios.length > 0 && (
            <section>
              <p className="subtitulo mb-2">Años · {anios.length}</p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {anios.map((a) => (
                  <li key={a.anio}>
                    <Link href={enlace({ anio: a.anio })} className="tarjeta flex items-center gap-3 p-3 transition hover:border-acento/60">
                      <Icono clase="text-acento" />
                      <span className="min-w-0">
                        <span className="block truncate text-white">{a.anio === SIN_FECHA ? "Sin fecha" : a.anio}</span>
                        <span className="font-mono text-xs secundario">
                          {a.cantidad} {a.cantidad === 1 ? "presupuesto" : "presupuestos"}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
              <Icono clase={c.tipo === "proveedor" ? "text-cyan-300" : "text-amarillo"} />
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

function Icono({ clase }: { clase: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 shrink-0 ${clase}`} fill="currentColor" aria-hidden>
      <path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" opacity="0.85" />
    </svg>
  );
}
