import Link from "next/link";
import { buscarStock, listarDepositos } from "@/lib/stock-datos";
import { formatoCantidad, formatoPrecio, totalDe } from "@/lib/stock";
import { AvisoError, ChipsDepositos } from "./componentes";

type Params = { q?: string; deposito?: string; importados?: string; nuevos?: string; error?: string };

// Stock propio: todos los artículos con la cantidad en cada depósito y el precio de referencia.
export default async function Stock({ searchParams }: { searchParams: Params }) {
  const q = (searchParams.q ?? "").trim();
  const depositoId = Number(searchParams.deposito) || undefined;
  const [articulos, depositos] = await Promise.all([buscarStock(q, depositoId), listarDepositos()]);
  const porId = new Map(depositos.map((d) => [d.id, d]));
  const conStock = articulos.filter((a) => totalDe(a) > 0).length;

  return (
    <div className="space-y-4">
      <div className="tarjeta space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="subtitulo text-amarillo">Stock propio</p>
            <h1 className="titulo mt-1">
              Artículos <span className="font-mono text-base text-acento">{articulos.length}</span>
              <span className="ml-2 font-mono text-sm font-normal secundario">{conStock} con existencia</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/stock/nuevo" className="boton">
              + Artículo
            </Link>
            <Link href="/stock/importar" className="boton-secundario">
              Pegar planilla
            </Link>
            <Link href="/stock/depositos" className="boton-secundario">
              Depósitos
            </Link>
          </div>
        </div>
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="PN, marca, descripción o motor" className="campo min-w-0 flex-1" autoCapitalize="none" />
          <select name="deposito" defaultValue={searchParams.deposito ?? ""} className="campo w-auto min-w-0 flex-1 sm:flex-none">
            <option value="">Todos los depósitos</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
          <button className="boton shrink-0">Buscar</button>
        </form>
      </div>

      <AvisoError error={searchParams.error} />
      {searchParams.importados && (
        <p className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
          Planilla cargada: {searchParams.importados} renglones, {searchParams.nuevos ?? 0} artículos nuevos.
        </p>
      )}

      <ul className="space-y-2 sm:hidden">
        {articulos.map((a) => (
          <li key={a.id}>
            <Link href={`/stock/${a.id}`} className="tarjeta block space-y-1.5 p-4 transition hover:border-acento/40">
              <div className="flex items-baseline justify-between gap-2">
                <span className="pn text-lg text-acento">{a.pn}</span>
                <span className="font-mono text-lg font-semibold text-white">{formatoCantidad(totalDe(a))}</span>
              </div>
              <p className="text-sm">
                {[a.marca, a.condicion].filter(Boolean).join(" · ")}
                {a.precio_venta != null && <span className="ml-2 font-mono text-emerald-300">{formatoPrecio(a.precio_venta, a.moneda)}</span>}
              </p>
              {a.descripcion && <p className="text-sm text-slate-300">{a.descripcion}</p>}
              <ChipsDepositos articulo={a} depositos={porId} />
            </Link>
          </li>
        ))}
        {articulos.length === 0 && <Vacio filtro={!!q || !!depositoId} />}
      </ul>

      <div className="tarjeta hidden overflow-x-auto p-0 sm:block">
        <table className="tabla">
          <thead>
            <tr>
              <th>PN</th>
              <th>Marca</th>
              <th>Descripción</th>
              <th>Condición</th>
              <th className="text-right">Total</th>
              <th>Por depósito</th>
              <th className="text-right">Precio ref.</th>
            </tr>
          </thead>
          <tbody>
            {articulos.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">
                  <Link href={`/stock/${a.id}`} className="pn enlace">
                    {a.pn}
                  </Link>
                </td>
                <td>{a.marca}</td>
                <td className="min-w-48">{a.descripcion}</td>
                <td className="whitespace-nowrap text-xs secundario">{a.condicion}</td>
                <td className="text-right font-mono font-semibold text-white">{formatoCantidad(totalDe(a))}</td>
                <td>
                  <ChipsDepositos articulo={a} depositos={porId} />
                </td>
                <td className="whitespace-nowrap text-right font-mono text-emerald-300">{formatoPrecio(a.precio_venta, a.moneda)}</td>
              </tr>
            ))}
            {articulos.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <Vacio filtro={!!q || !!depositoId} tabla />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {articulos.length === 500 && <p className="text-sm secundario">Se muestran los primeros 500: buscá para achicar la lista.</p>}
    </div>
  );
}

function Vacio({ filtro, tabla }: { filtro: boolean; tabla?: boolean }) {
  const texto = filtro ? "No hay artículos con ese filtro." : "Todavía no hay artículos en stock. Cargá uno o pegá tu planilla.";
  return tabla ? <p className="secundario">{texto}</p> : <li className="tarjeta secundario">{texto}</li>;
}
