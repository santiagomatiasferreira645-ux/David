import Link from "next/link";
import { formatoCantidad, formatoPrecio, totalDe, type ArticuloStock, type Deposito } from "@/lib/stock";
import { ChipsDepositos } from "./componentes";

// En los resultados de una búsqueda: si el PN está en nuestro stock, cuánto hay, dónde y a qué precio.
export function EnStock({ articulos, depositos }: { articulos: ArticuloStock[]; depositos: Map<number, Deposito> }) {
  return (
    <section className="tarjeta relative overflow-hidden pl-5">
      <span className="absolute inset-y-0 left-0 w-1 bg-verde" aria-hidden />
      <p className="subtitulo text-verde">En stock propio</p>
      <ul className="mt-2 divide-y divide-borde/60">
        {articulos.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
            <div className="mr-auto min-w-0 space-y-1">
              <Link href={`/stock/${a.id}`} className="enlace">
                <span className="pn">{a.pn}</span> {a.marca && <span className="text-texto">· {a.marca}</span>}
              </Link>
              <p className="text-xs secundario">{[a.condicion, a.descripcion].filter(Boolean).join(" · ")}</p>
              <ChipsDepositos articulo={a} depositos={depositos} />
            </div>
            <div className="text-right font-mono">
              <p className="text-xl font-semibold text-white">{formatoCantidad(totalDe(a))} u.</p>
              {a.precio_venta != null && <p className="text-sm text-emerald-300">{formatoPrecio(a.precio_venta, a.moneda)}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
