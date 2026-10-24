import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";

const MARCAS = ["EMD", "CAT", "MAK", "GE", "John Deere", "Cummins", "Detroit", "Volvo Penta", "MTU", "Wärtsilä", "Reintjes", "Twin Disc", "ZF", "Weichai", "Perkins"];

export default async function Inicio() {
  const supabase = clienteServidor();
  const [{ data: recientes }, prov, cot, abiertas] = await Promise.all([
    supabase.from("busquedas").select("id, pn, marca, estado, creado_en").order("creado_en", { ascending: false }).limit(6),
    supabase.from("proveedores").select("id", { count: "exact", head: true }),
    supabase.from("cotizaciones").select("id", { count: "exact", head: true }),
    supabase.from("busquedas").select("id", { count: "exact", head: true }).eq("estado", "abierta"),
  ]);

  const cifras = [
    { texto: "Proveedores", valor: prov.count },
    { texto: "Precios registrados", valor: cot.count },
    { texto: "Búsquedas abiertas", valor: abiertas.count },
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
      </form>

      <div className="grid grid-cols-3 gap-3">
        {cifras.map((c) => (
          <div key={c.texto} className="tarjeta p-3 sm:p-4">
            <p className="subtitulo">{c.texto}</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-white">{c.valor ?? "–"}</p>
          </div>
        ))}
      </div>

      {recientes && recientes.length > 0 && (
        <section>
          <h2 className="subtitulo mb-2">Últimas búsquedas</h2>
          <ul className="flex flex-wrap gap-2">
            {recientes.map((b) => (
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
