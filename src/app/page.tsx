import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";

const MARCAS = ["EMD", "CAT", "MAK", "GE", "John Deere", "Cummins", "Detroit", "Volvo Penta", "MTU", "Wärtsilä", "Reintjes", "Twin Disc", "ZF", "Weichai", "Perkins"];

export default async function Inicio() {
  const { data: recientes } = await clienteServidor()
    .from("busquedas")
    .select("id, pn, marca, estado, creado_en")
    .order("creado_en", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <form action="/buscar" className="tarjeta space-y-4">
        <h1 className="text-xl font-bold">Buscar repuesto</h1>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label className="etiqueta" htmlFor="pn">PN</label>
            <input id="pn" name="pn" required autoFocus placeholder="ej. 8N-7005" className="campo" autoCapitalize="characters" />
          </div>
          <div>
            <label className="etiqueta" htmlFor="marca">Marca</label>
            <input id="marca" name="marca" list="marcas" placeholder="ej. CAT" className="campo" />
            <datalist id="marcas">
              {MARCAS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="etiqueta" htmlFor="cantidad">Cantidad</label>
            <input id="cantidad" name="cantidad" type="number" min="1" defaultValue="1" className="campo" />
          </div>
        </div>
        <div>
          <label className="etiqueta" htmlFor="cliente">Cliente o embarcación (opcional)</label>
          <input id="cliente" name="cliente" className="campo" />
        </div>
        <button className="boton w-full sm:w-auto">Buscar proveedores</button>
      </form>

      {recientes && recientes.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">Últimas búsquedas</h2>
          <ul className="flex flex-wrap gap-2">
            {recientes.map((b) => (
              <li key={b.id}>
                <Link href={`/buscar?id=${b.id}`} className="boton-secundario">
                  {b.pn} {b.marca && <span className="text-slate-500">· {b.marca}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
