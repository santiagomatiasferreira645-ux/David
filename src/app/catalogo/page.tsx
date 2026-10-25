import { buscarEnCatalogo } from "@/lib/catalogo";
import { TablaCatalogo } from "./tabla";

export default async function Catalogo({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const filas = q ? await buscarEnCatalogo(q) : [];

  return (
    <div className="space-y-4">
      <form className="tarjeta space-y-4 p-5">
        <div>
          <p className="subtitulo text-acento">Catálogos de fábrica</p>
          <h1 className="titulo mt-1">EMD 645 · Catálogo 302</h1>
          <p className="mt-1 text-sm secundario">Motores de 8, 12, 16 y 20 cilindros. Buscá por PN o por palabras en inglés, como está en el manual (ej. bearing main).</p>
        </div>
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
