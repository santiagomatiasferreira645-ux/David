import Link from "next/link";
import { POR_PAGINA, buscarEnCatalogo, contarPn, filasDeCatalogo, listarCatalogos } from "@/lib/catalogo";
import { TablaCatalogo } from "./tabla";

type Params = { q?: string; marca?: string; catalogo?: string; p?: string };

function enlace(params: Params): string {
  const u = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
  const s = u.toString();
  return `/catalogo${s ? `?${s}` : ""}`;
}

// Catálogos de fábrica agrupados por marca: marcas > manuales de esa marca > PN de un manual. La búsqueda se limita a donde estás parado.
export default async function Catalogo({ searchParams }: { searchParams: Params }) {
  const q = (searchParams.q ?? "").trim();
  const todos = await listarCatalogos();
  const catalogo = todos.find((c) => c.nombre === searchParams.catalogo);
  const marca = catalogo?.marca ?? (todos.some((c) => c.marca === searchParams.marca) ? searchParams.marca : undefined);
  const deLaMarca = marca ? todos.filter((c) => c.marca === marca) : todos;
  const alcance = catalogo ? [catalogo.nombre] : marca ? deLaMarca.map((c) => c.nombre) : undefined;
  const pagina = Math.max(1, Number(searchParams.p) || 1);

  const [filas, cuentas, listado] = await Promise.all([
    q ? buscarEnCatalogo(q, alcance) : [],
    contarPn(deLaMarca.map((c) => c.nombre)),
    catalogo && !q ? filasDeCatalogo(catalogo.nombre, pagina) : [],
  ]);

  const marcas = Array.from(new Set(todos.map((c) => c.marca))).sort((a, b) => a.localeCompare(b));
  const totalCatalogo = catalogo ? cuentas.get(catalogo.nombre) ?? 0 : 0;
  const paginas = Math.ceil(totalCatalogo / POR_PAGINA);

  return (
    <div className="space-y-4">
      <form className="tarjeta space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <nav className="subtitulo flex flex-wrap items-center gap-x-2 text-amarillo">
              <Link href="/catalogo" className="hover:text-white">
                Catálogos de fábrica
              </Link>
              {marca && (
                <>
                  <span className="secundario">›</span>
                  <Link href={enlace({ marca })} className="hover:text-white">
                    {marca}
                  </Link>
                </>
              )}
            </nav>
            <h1 className="titulo mt-1">{catalogo ? catalogo.nombre : marca ? `Manuales de ${marca}` : "Buscar en los manuales"}</h1>
            <p className="mt-1 text-sm secundario">
              Buscá por PN o por palabras como están en el manual, en inglés (ej. bearing main)
              {catalogo ? ", solo en este manual." : marca ? `, solo en los manuales de ${marca}.` : "."}
            </p>
          </div>
          <Link href="/catalogo/cargar" className="boton-secundario">
            + Cargar catálogo
          </Link>
        </div>
        {marca && <input type="hidden" name="marca" value={marca} />}
        {catalogo && <input type="hidden" name="catalogo" value={catalogo.nombre} />}
        <div className="flex gap-2">
          <input name="q" defaultValue={q} required placeholder="8455666 o bearing main" className="campo" autoCapitalize="none" />
          <button className="boton shrink-0">Buscar</button>
        </div>
      </form>

      {q && (
        <section className="tarjeta">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="subtitulo">{filas.length === 200 ? "Primeros 200 resultados" : `${filas.length} resultados`}</p>
            <Link href={enlace({ marca: catalogo ? undefined : marca, catalogo: catalogo?.nombre })} className="enlace text-sm">
              Limpiar búsqueda
            </Link>
          </div>
          {filas.length ? <TablaCatalogo filas={filas} /> : <p className="py-2 text-sm secundario">No hay coincidencias en el catálogo.</p>}
        </section>
      )}

      {!q && !marca && (
        <section className="tarjeta">
          <p className="subtitulo mb-3">Por marca</p>
          {marcas.length === 0 && <p className="text-sm secundario">Todavía no hay catálogos cargados.</p>}
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {marcas.map((m) => {
              const suyos = todos.filter((c) => c.marca === m);
              const pn = suyos.reduce((s, c) => s + (cuentas.get(c.nombre) ?? 0), 0);
              return (
                <li key={m}>
                  <Link href={enlace({ marca: m })} className="block rounded-lg border border-borde bg-fondo/40 p-4 transition hover:border-acento/60">
                    <span className="block text-base font-semibold text-white">{m}</span>
                    <span className="mt-1 block font-mono text-xs secundario">
                      {suyos.length} {suyos.length === 1 ? "manual" : "manuales"} · {pn.toLocaleString("es")} PN
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!q && marca && !catalogo && (
        <section className="tarjeta">
          <p className="subtitulo mb-3">Manuales disponibles</p>
          <ul className="divide-y divide-borde/60">
            {deLaMarca.map((c) => (
              <li key={c.nombre} className="flex flex-wrap items-center gap-2 py-3">
                <Link href={enlace({ catalogo: c.nombre })} className="mr-auto min-w-0">
                  <span className="block text-white hover:text-acento">{c.nombre}</span>
                  <span className="font-mono text-xs secundario">
                    {(cuentas.get(c.nombre) ?? 0).toLocaleString("es")} PN{c.paginas ? ` · ${c.paginas} págs.` : ""}
                    {c.estado !== "listo" && <span className="text-amber-300"> · a medias</span>}
                  </span>
                </Link>
                <Link href={enlace({ catalogo: c.nombre })} className="chip border-acento/40 bg-acento/10 py-1.5 text-acento">
                  Ver PN
                </Link>
                <Link href={`/catalogo/ver?archivo=${encodeURIComponent(c.archivo)}&pagina=1`} className="chip border-borde py-1.5 text-apagado">
                  Abrir PDF
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!q && catalogo && (
        <section className="tarjeta">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <p className="subtitulo">
              {totalCatalogo.toLocaleString("es")} PN{paginas > 1 && ` · página ${pagina} de ${paginas}`}
            </p>
            <Link href={`/catalogo/ver?archivo=${encodeURIComponent(catalogo.archivo)}&pagina=1`} className="enlace text-sm">
              Abrir PDF
            </Link>
          </div>
          {listado.length ? <TablaCatalogo filas={listado} /> : <p className="py-2 text-sm secundario">Este manual no tiene PN cargados.</p>}
          {paginas > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2">
              {pagina > 1 ? (
                <Link href={enlace({ catalogo: catalogo.nombre, p: String(pagina - 1) })} className="boton-secundario">
                  ‹ Anteriores
                </Link>
              ) : (
                <span />
              )}
              {pagina < paginas && (
                <Link href={enlace({ catalogo: catalogo.nombre, p: String(pagina + 1) })} className="boton-secundario">
                  Siguientes ›
                </Link>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
