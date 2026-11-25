import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import {
  CATEGORIAS_SERVICIO,
  filtroPalabra,
  formatoPrecio,
  palabrasBusqueda,
  resumenPrecios,
  textoUnidad,
  type Servicio,
} from "@/lib/servicios";

type Params = { q?: string; prestador?: string; categoria?: string };
type Fila = Servicio & { proveedores: { empresa: string } | null };

const ESTADO_COLOR: Record<string, string> = {
  presupuestado: "border-borde text-apagado",
  aprobado: "border-acento/40 text-acento",
  realizado: "border-verde/40 text-verde",
  perdido: "border-red-400/40 text-red-300",
};

// Servicios presupuestados, propios o de proveedores parceros, para dar un precio de referencia desde el celular.
export default async function Servicios({ searchParams }: { searchParams: Params }) {
  const palabras = palabrasBusqueda(searchParams.q);
  const prestador = searchParams.prestador === "propio" || searchParams.prestador === "proveedor" ? searchParams.prestador : "";
  const categoria = (CATEGORIAS_SERVICIO as readonly string[]).includes(searchParams.categoria ?? "") ? searchParams.categoria! : "";

  let consulta = clienteServidor()
    .from("servicios")
    .select("*, proveedores(empresa)")
    .order("fecha", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(500);
  for (const p of palabras) consulta = consulta.or(filtroPalabra(p)); // cada palabra tiene que aparecer en algún campo
  if (prestador) consulta = consulta.eq("prestador", prestador);
  if (categoria) consulta = consulta.eq("categoria", categoria);
  const { data, error } = await consulta;
  const servicios = (data ?? []) as Fila[];
  const resumen = palabras.length || categoria ? resumenPrecios(servicios) : [];

  const filtroLink = (cambios: Partial<Params>) => {
    const u = new URLSearchParams();
    const todo = { q: searchParams.q, prestador, categoria, ...cambios };
    for (const [k, v] of Object.entries(todo)) if (v) u.set(k, v);
    const qs = u.toString();
    return `/servicios${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="titulo">
          Servicios <span className="font-mono text-base text-acento">{servicios.length}</span>
        </h1>
        <Link href="/servicios/nuevo" className="boton">
          + Cargar servicio
        </Link>
      </div>

      <form className="flex gap-2">
        {prestador && <input type="hidden" name="prestador" value={prestador} />}
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        <input
          name="q"
          type="search"
          defaultValue={searchParams.q}
          placeholder="Ej. overhaul 16-645, rectificado cigüeñal"
          className="campo min-w-0 flex-1"
          enterKeyHint="search"
        />
        <button className="boton-secundario shrink-0">Buscar</button>
      </form>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Filtro href={filtroLink({ prestador: "" })} activo={!prestador} texto="Todos" />
        <Filtro href={filtroLink({ prestador: "propio" })} activo={prestador === "propio"} texto="Propios" />
        <Filtro href={filtroLink({ prestador: "proveedor" })} activo={prestador === "proveedor"} texto="De proveedores" />
        <span className="mx-1 w-px shrink-0 bg-borde" aria-hidden />
        {CATEGORIAS_SERVICIO.map((c) => (
          <Filtro key={c} href={filtroLink({ categoria: categoria === c ? "" : c })} activo={categoria === c} texto={c} />
        ))}
      </div>

      {error && <p className="tarjeta text-sm text-red-300">No se pudieron leer los servicios: {error.message}. ¿Se ejecutó la migración 0008_servicios.sql?</p>}

      {resumen.length > 0 && (
        <section className="tarjeta border-amarillo/30">
          <h2 className="subtitulo text-amarillo">Precio de referencia</h2>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2">
            {resumen.map((r) => (
              <li key={r.moneda + r.unidad} className="font-mono">
                <p className="text-lg text-emerald-300">
                  {r.minimo === r.maximo ? formatoPrecio(r.minimo, r.moneda) : `${r.minimo.toLocaleString("es")} – ${formatoPrecio(r.maximo, r.moneda)}`}
                  {r.unidad && <span className="text-xs secundario"> {textoUnidad(r.unidad)}</span>}
                </p>
                <p className="text-xs secundario">
                  {r.cantidad} {r.cantidad === 1 ? "presupuesto" : "presupuestos"} · último {formatoPrecio(r.ultimo.precio, r.moneda)}
                  {r.ultimo.fecha && ` (${r.ultimo.fecha})`}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs secundario">Incluye todos los presupuestos que coinciden con la búsqueda, también los perdidos.</p>
        </section>
      )}

      <ul className="space-y-2 sm:hidden">
        {servicios.map((s) => (
          <li key={s.id}>
            <Link href={`/servicios/${s.id}`} className="tarjeta block space-y-1.5 p-4 transition hover:border-acento/40">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-amarillo">{s.categoria}</span>
                <span className={`chip ${ESTADO_COLOR[s.estado] ?? ""}`}>{s.estado}</span>
              </div>
              <p className="text-sm text-white">{s.descripcion}</p>
              <p className="font-mono text-base text-emerald-300">
                {formatoPrecio(s.precio, s.moneda)} <span className="text-xs secundario">{textoUnidad(s.unidad)}</span>
              </p>
              <p className="text-xs secundario">{detalle(s).join(" · ")}</p>
            </Link>
          </li>
        ))}
        {servicios.length === 0 && !error && <li className="tarjeta secundario">{vacio(palabras.length > 0 || !!prestador || !!categoria)}</li>}
      </ul>

      <div className="tarjeta hidden overflow-x-auto p-0 sm:block">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Servicio</th>
              <th>Quién</th>
              <th>Cliente / lugar</th>
              <th>Precio</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((s) => (
              <tr key={s.id}>
                <td className="whitespace-nowrap font-mono text-xs secundario">{s.fecha}</td>
                <td className="min-w-64">
                  <Link href={`/servicios/${s.id}`} className="text-white hover:text-acento">
                    {s.descripcion}
                  </Link>
                  <p className="text-xs secundario">{[s.categoria, s.marca, s.modelo_motor, s.equipo].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="text-sm">{quien(s)}</td>
                <td className="text-sm">{[s.cliente, s.lugar].filter(Boolean).join(" · ")}</td>
                <td className="whitespace-nowrap font-mono">
                  <span className={s.precio == null ? "text-xs secundario" : "text-emerald-300"}>{formatoPrecio(s.precio, s.moneda)}</span>
                  {textoUnidad(s.unidad) && <span className="block text-xs secundario">{textoUnidad(s.unidad)}</span>}
                </td>
                <td>
                  <span className={`chip ${ESTADO_COLOR[s.estado] ?? ""}`}>{s.estado}</span>
                </td>
              </tr>
            ))}
            {servicios.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="secundario">
                  {vacio(palabras.length > 0 || !!prestador || !!categoria)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function quien(s: Fila): string {
  if (s.prestador === "propio") return "Propio";
  return s.proveedores?.empresa ?? s.proveedor_nombre ?? "Proveedor";
}

function detalle(s: Fila): string[] {
  return [quien(s), [s.marca, s.modelo_motor].filter(Boolean).join(" "), s.cliente, s.lugar, s.fecha].filter((x): x is string => !!x);
}

function vacio(filtrado: boolean): string {
  return filtrado ? "No hay servicios con ese filtro." : "Todavía no hay servicios cargados. Tocá Cargar servicio para agregar el primero.";
}

function Filtro(p: { href: string; activo: boolean; texto: string }) {
  return (
    <Link
      href={p.href}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition ${
        p.activo ? "border-acento/50 bg-acento/10 text-acento" : "border-borde text-apagado hover:text-texto"
      }`}
    >
      {p.texto}
    </Link>
  );
}
