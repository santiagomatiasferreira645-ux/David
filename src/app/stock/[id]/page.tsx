import Link from "next/link";
import { notFound } from "next/navigation";
import { listarDepositos, movimientosDe, obtenerArticulo } from "@/lib/stock-datos";
import { TEXTO_MOVIMIENTO, formatoCantidad, formatoPrecio, totalDe, type TipoMovimiento } from "@/lib/stock";
import { borrarArticulo, cambiarUbicacion, editarArticulo, registrarMovimiento } from "../acciones";
import { AvisoError, CamposArticulo, Encabezado } from "../componentes";
import { FormMovimiento } from "./movimiento";

type Params = { error?: string; editar?: string };

// Ficha del artículo: cuánto hay en cada depósito, precio de referencia, movimientos y edición.
export default async function Articulo({ params, searchParams }: { params: { id: string }; searchParams: Params }) {
  const id = Number(params.id);
  const [articulo, depositos, movimientos] = await Promise.all([obtenerArticulo(id), listarDepositos(), movimientosDe(id)]);
  if (!articulo) notFound();

  const porId = new Map(depositos.map((d) => [d.id, d]));
  const existencias = Object.fromEntries(articulo.stock_existencias.map((e) => [e.deposito_id, Number(e.cantidad)]));
  const filas = articulo.stock_existencias.filter((e) => Number(e.cantidad) > 0).sort((a, b) => Number(b.cantidad) - Number(a.cantidad));
  // En el formulario: los depósitos activos y los inactivos que todavía tienen algo, para poder vaciarlos.
  const paraMover = depositos.filter((d) => d.activo || (existencias[d.id] ?? 0) > 0);
  const total = totalDe(articulo);
  const buscarPn = `/buscar?pn=${encodeURIComponent(articulo.pn)}&marca=${encodeURIComponent(articulo.marca ?? "")}`;

  return (
    <div className="space-y-4">
      <section className="tarjeta space-y-4 p-5">
        <Encabezado>
          <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="pn text-2xl font-semibold text-white sm:text-3xl">{articulo.pn}</span>
            {articulo.marca && <span className="font-mono text-lg text-acento">{articulo.marca}</span>}
            <span className="chip border-borde text-apagado">{articulo.condicion}</span>
          </h1>
          {articulo.descripcion && <p className="mt-1 text-slate-300">{articulo.descripcion}</p>}
          {articulo.modelo_motor && <p className="mt-0.5 text-sm secundario">Motor / reductor: {articulo.modelo_motor}</p>}
        </Encabezado>
        <div className="flex flex-wrap gap-6 font-mono">
          <div>
            <p className="subtitulo">En stock</p>
            <p className="text-3xl font-semibold text-white">{formatoCantidad(total)}</p>
          </div>
          <div>
            <p className="subtitulo">Precio de referencia</p>
            <p className="text-3xl font-semibold text-emerald-300">{formatoPrecio(articulo.precio_venta, articulo.moneda) ?? <span className="text-base secundario">sin precio</span>}</p>
          </div>
          {articulo.costo_unitario != null && (
            <div>
              <p className="subtitulo">Costo</p>
              <p className="pt-2 text-lg text-slate-300">{formatoPrecio(articulo.costo_unitario, articulo.moneda)}</p>
            </div>
          )}
        </div>
        {articulo.notas && <p className="whitespace-pre-line text-sm text-slate-300">{articulo.notas}</p>}
        <div className="flex flex-wrap gap-2">
          <Link href={buscarPn} className="boton-secundario">
            Buscar proveedores de este PN
          </Link>
          <Link href={`/catalogo?q=${encodeURIComponent(articulo.pn)}`} className="boton-secundario">
            Ver en catálogos
          </Link>
        </div>
      </section>

      <AvisoError error={searchParams.error} />

      <section className="tarjeta">
        <p className="subtitulo mb-2 text-amarillo">Por depósito</p>
        {filas.length === 0 ? (
          <p className="text-sm secundario">No hay existencias en ningún depósito.</p>
        ) : (
          <ul className="divide-y divide-borde/60">
            {filas.map((e) => {
              const d = porId.get(e.deposito_id);
              return (
                <li key={e.deposito_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2">
                  <div className="mr-auto min-w-0">
                    <p className="font-medium text-white">{d?.nombre}</p>
                    {d?.ubicacion && <p className="text-xs secundario">{d.ubicacion}</p>}
                  </div>
                  <form action={cambiarUbicacion} className="flex items-center gap-1">
                    <input type="hidden" name="articulo" value={articulo.id} />
                    <input type="hidden" name="deposito" value={e.deposito_id} />
                    <input name="ubicacion" defaultValue={e.ubicacion ?? ""} placeholder="Estante" className="campo w-28 py-1 text-sm" aria-label="Estante o sector" />
                    <button className="boton-secundario px-2 py-1 text-xs">OK</button>
                  </form>
                  <span className="w-16 text-right font-mono text-xl font-semibold text-verde">{formatoCantidad(Number(e.cantidad))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="tarjeta">
        <p className="subtitulo mb-3 text-amarillo">Registrar movimiento</p>
        {paraMover.length ? (
          <FormMovimiento articuloId={articulo.id} depositos={paraMover} existencias={existencias} accion={registrarMovimiento} />
        ) : (
          <p className="text-sm secundario">
            Primero creá un depósito en <Link href="/stock/depositos" className="enlace">Depósitos</Link>.
          </p>
        )}
      </section>

      <section className="tarjeta">
        <p className="subtitulo mb-2">Movimientos</p>
        {movimientos.length === 0 ? (
          <p className="text-sm secundario">Sin movimientos.</p>
        ) : (
          <ul className="divide-y divide-borde/60 text-sm">
            {movimientos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="w-24 font-mono text-xs secundario">{new Date(m.fecha).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</span>
                <span className="w-28">{TEXTO_MOVIMIENTO[m.tipo as TipoMovimiento] ?? m.tipo}</span>
                <span className="mr-auto">{porId.get(m.deposito_id)?.nombre}</span>
                <span className={`font-mono font-semibold ${m.cantidad > 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {m.cantidad > 0 ? "+" : ""}
                  {formatoCantidad(Number(m.cantidad))}
                </span>
                {(m.referencia || m.notas) && <span className="w-full pl-0 text-xs secundario sm:pl-[13.5rem]">{[m.referencia, m.notas].filter(Boolean).join(" · ")}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="tarjeta" open={!!searchParams.editar}>
        <summary className="subtitulo cursor-pointer hover:text-white">Editar datos del artículo</summary>
        <form action={editarArticulo} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={articulo.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CamposArticulo a={articulo} />
          </div>
          <button className="boton">Guardar cambios</button>
        </form>
        <details className="mt-6 border-t border-borde/60 pt-4">
          <summary className="cursor-pointer text-sm text-red-300">Borrar este artículo</summary>
          <form action={borrarArticulo} className="mt-2 flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={articulo.id} />
            <p className="text-sm secundario">Se borran también sus existencias y movimientos. No se puede deshacer.</p>
            <button className="rounded-md border border-red-400/50 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-400/10">Sí, borrar</button>
          </form>
        </details>
      </details>
    </div>
  );
}
