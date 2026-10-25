import Link from "next/link";
import { buscarEnCatalogo, listarCatalogos } from "@/lib/catalogo";
import { TablaCatalogo } from "./tabla";

export default async function Catalogo({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const [filas, catalogos] = await Promise.all([q ? buscarEnCatalogo(q) : [], listarCatalogos()]);

  return (
    <div className="space-y-4">
      <form className="tarjeta space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="subtitulo text-acento">Catálogos de fábrica</p>
            <h1 className="titulo mt-1">Buscar en los manuales</h1>
            <p className="mt-1 text-sm secundario">Buscá por PN o por palabras como están en el manual, en inglés (ej. bearing main).</p>
          </div>
          <Link href="/catalogo/cargar" className="boton-secundario">
            + Cargar catálogo
          </Link>
        </div>
        {catalogos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {catalogos.map((c) => (
              <span key={c.nombre} className={`chip ${c.estado === "listo" ? "border-borde text-slate-300" : "border-amber-400/40 text-amber-300"}`}>
                {c.nombre}
                {c.estado !== "listo" && " · a medias"}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input name="q" defaultValue={q} required placeholder="8455666 o bearing main" className="campo" autoCapitalize="none" />
          <button className="boton shrink-0">Buscar</button>
        </div>
      </form>

      {q && (
        <section className="tarjeta">
          <p className="subtitulo mb-1">
            {filas.length === 200 ? "Primeros 200 resultados" : `${filas.length} resultados`}
          </p>
          {filas.length ? <TablaCatalogo filas={filas} /> : <p className="py-2 text-sm secundario">No hay coincidencias en el catálogo.</p>}
        </section>
      )}
    </div>
  );
}
