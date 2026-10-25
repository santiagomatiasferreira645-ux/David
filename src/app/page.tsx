import Link from "next/link";
import { MARCAS_FRECUENTES as MARCAS } from "@/lib/marcas";
import { normalizarPn } from "@/lib/pn";
import { clienteServidor } from "@/lib/supabase/servidor";


export default async function Inicio() {
  const supabase = clienteServidor();
  const [{ data: recientes }, prov, cot, abiertas] = await Promise.all([
    supabase.from("busquedas").select("id, pn, marca, estado, creado_en").order("creado_en", { ascending: false }).limit(30),
    supabase.from("proveedores").select("id", { count: "exact", head: true }),
    supabase.from("cotizaciones").select("id", { count: "exact", head: true }),
    supabase.from("busquedas").select("id", { count: "exact", head: true }).eq("estado", "abierta"),
  ]);

  // El mismo PN escrito distinto (8N-7005 / 8n7005) cuenta una sola vez.
  const vistos = new Set<string>();
  const ultimas = (recientes ?? [])
    .filter((b) => {
      const clave = `${normalizarPn(b.pn)}|${(b.marca ?? "").toLowerCase()}`;
      if (vistos.has(clave)) return false;
      vistos.add(clave);
      return true;
    })
    .slice(0, 6);

  const cifras = [
    { texto: "Proveedores", corto: "Proveedores", valor: prov.count, linea: "border-t-acento/70" },
    { texto: "Precios registrados", corto: "Precios", valor: cot.count, linea: "border-t-verde/70" },
    { texto: "Búsquedas abiertas", corto: "Abiertas", valor: abiertas.count, linea: "border-t-amarillo/70" },
  ];

  return (
    <div className="space-y-6">
      <form action="/buscar" className="tarjeta space-y-5 p-5 sm:p-6">
        <div>
          <p className="subtitulo text-acento">Motor de búsqueda</p>
          <h1 className="titulo mt-1 text-2xl">Buscar repuesto por PN</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label className="etiqueta" htmlFor="pn">Part number</label>
            <input id="pn" name="pn" required autoFocus placeholder="8N-7005" className="campo-pn text-lg" autoCapitalize="characters" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="marca">Marca</label>
            <input id="marca" name="marca" list="marcas" placeholder="CAT" className="campo" />
            <datalist id="marcas">
              {MARCAS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="etiqueta" htmlFor="cantidad">Cantidad</label>
            <input id="cantidad" name="cantidad" type="number" min="1" defaultValue="1" className="campo font-mono" />
          </div>
        </div>
        <div>
          <label className="etiqueta" htmlFor="cliente">Cliente o embarcación (opcional)</label>
          <input id="cliente" name="cliente" className="campo" />
        </div>
        <button className="boton w-full sm:w-auto">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          Buscar proveedores
        </button>
        <Link href="/buscar/multiple" className="boton-secundario mt-2 w-full sm:ml-2 sm:mt-0 sm:w-auto">
          Búsqueda múltiple
        </Link>
        <Link href="/catalogo" className="enlace block text-sm sm:ml-4 sm:inline">
          Consultar catálogos de fábrica →
        </Link>
      </form>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {cifras.map((c) => (
          <div key={c.texto} className={`tarjeta min-w-0 border-t-2 px-1 py-3 text-center sm:p-4 ${c.linea}`}>
            <p className="whitespace-nowrap font-mono text-[0.625rem] font-medium uppercase tracking-[0.02em] text-apagado sm:text-[11px] sm:tracking-[0.14em]">
              <span className="sm:hidden">{c.corto}</span>
              <span className="hidden sm:inline">{c.texto}</span>
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">{c.valor ?? "–"}</p>
          </div>
        ))}
      </div>

      {ultimas.length > 0 && (
        <section>
          <h2 className="subtitulo mb-2">Últimas búsquedas</h2>
          <ul className="flex flex-wrap gap-2">
            {ultimas.map((b) => (
              <li key={b.id}>
                <Link href={`/buscar?id=${b.id}`} className="boton-secundario">
                  <span className="pn">{b.pn}</span> {b.marca && <span className="secundario">· {b.marca}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
