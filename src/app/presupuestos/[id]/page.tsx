import Link from "next/link";
import { notFound } from "next/navigation";
import { TIPO_TEXTO, type ItemPresupuesto, type Presupuesto } from "@/lib/presupuestos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { precioTexto, TipoChip } from "../precios";
import { borrarItem, borrarPresupuesto, guardarEncabezado, guardarItem } from "./acciones";
import { BotonBorrar, Releer } from "./releer";

export default async function VerPresupuesto({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const supabase = clienteServidor();
  const [{ data }, { data: filas }] = await Promise.all([
    supabase.from("presupuestos").select("*, proveedores(id, empresa)").eq("id", id).maybeSingle(),
    supabase.from("presupuesto_items").select("*").eq("presupuesto_id", id).order("id"),
  ]);
  if (!data) notFound();
  const p = data as Presupuesto & { proveedores: { id: string; empresa: string } | null };
  const items = (filas ?? []) as ItemPresupuesto[];
  const { data: firmado } = await supabase.storage.from("presupuestos").createSignedUrl(p.archivo, 60 * 60);
  const repuestos = items.filter((i) => i.clase === "repuesto");
  const servicios = items.filter((i) => i.clase === "servicio");

  return (
    <div className="space-y-4">
      <div className="tarjeta space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="subtitulo flex flex-wrap items-center gap-2">
              Presupuesto {p.numero && `N° ${p.numero}`} <TipoChip tipo={p.tipo} />
            </p>
            <h1 className="titulo mt-1 break-words">{(p.tipo === "proveedor" ? p.proveedor_nombre : p.cliente) ?? p.nombre_archivo}</h1>
            <p className="mt-1 font-mono text-sm secundario">
              {[p.fecha, p.empresa, p.moneda, p.total != null && `total ${precioTexto(p.total, p.moneda)}`].filter(Boolean).join(" · ")}
            </p>
            {p.proveedores && (
              <p className="mt-1 text-sm">
                Proveedor en la base: <Link href={`/proveedores/${p.proveedores.id}`} className="enlace">{p.proveedores.empresa}</Link>
              </p>
            )}
            {p.condiciones && <p className="mt-1 text-sm secundario">{p.condiciones}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {firmado?.signedUrl && (
              <a href={firmado.signedUrl} target="_blank" rel="noreferrer" className="boton-secundario">
                Ver archivo
              </a>
            )}
            <Releer id={p.id} primeraVez={p.estado !== "listo"} />
          </div>
        </div>
        {p.estado === "procesando" && <p className="text-sm text-amber-300">Todavía no se leyó con IA (o se cortó a la mitad).</p>}
        {p.error && <p className={`text-sm ${p.estado === "error" ? "text-red-400" : "text-amber-300"}`}>{p.error}</p>}

        <details className="border-t border-borde/60 pt-3">
          <summary className="cursor-pointer text-sm text-acento">Corregir datos del presupuesto</summary>
          <form action={guardarEncabezado.bind(null, p.id)} className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="etiqueta">Tipo</label>
              <select name="tipo" defaultValue={p.tipo ?? ""} className="campo">
                <option value="propio">{TIPO_TEXTO.propio}</option>
                <option value="proveedor">{TIPO_TEXTO.proveedor}</option>
              </select>
            </div>
            <Campo nombre="fecha" etiqueta="Fecha" valor={p.fecha} tipo="date" />
            <Campo nombre="numero" etiqueta="Número" valor={p.numero} />
            <Campo nombre="cliente" etiqueta="Cliente o embarcación" valor={p.cliente} />
            <Campo nombre="proveedor_nombre" etiqueta="Proveedor" valor={p.proveedor_nombre} />
            <Campo nombre="moneda" etiqueta="Moneda" valor={p.moneda} />
            <div className="sm:col-span-3">
              <Campo nombre="notas" etiqueta="Notas" valor={p.notas} />
            </div>
            <button className="boton w-fit">Guardar</button>
          </form>
        </details>
      </div>

      <Renglones titulo="Repuestos" presupuestoId={p.id} items={repuestos} />
      <Renglones titulo="Servicios" presupuestoId={p.id} items={servicios} nota={servicios.length > 0 ? "También figuran en el módulo de Servicios." : undefined} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/presupuestos" className="enlace text-sm">
          ← Volver a presupuestos
        </Link>
        <BotonBorrar accion={borrarPresupuesto.bind(null, p.id)} />
      </div>
    </div>
  );
}

function Campo({ nombre, etiqueta, valor, tipo = "text" }: { nombre: string; etiqueta: string; valor: string | number | null; tipo?: string }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={nombre}>{etiqueta}</label>
      <input id={nombre} name={nombre} type={tipo} defaultValue={valor ?? ""} className="campo" />
    </div>
  );
}

function Renglones({ titulo, presupuestoId, items, nota }: { titulo: string; presupuestoId: number; items: ItemPresupuesto[]; nota?: string }) {
  if (!items.length) return null;
  return (
    <section className="tarjeta">
      <p className="subtitulo">
        {titulo} · {items.length}
      </p>
      {nota && <p className="mt-1 text-xs secundario">{nota}</p>}
      <ul className="mt-2 divide-y divide-borde/60">
        {items.map((i) => (
          <li key={i.id} className="py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-2">
                  {i.pn && (
                    <Link href={`/buscar?pn=${encodeURIComponent(i.pn)}&marca=${encodeURIComponent(i.marca ?? "")}`} className="pn enlace">
                      {i.pn}
                    </Link>
                  )}
                  {i.marca && <span className="font-mono text-sm text-acento">{i.marca}</span>}
                </p>
                <p className="text-sm text-slate-300">{i.descripcion}</p>
                {(i.modelo_motor || i.notas) && <p className="text-xs secundario">{[i.modelo_motor, i.notas].filter(Boolean).join(" · ")}</p>}
              </div>
              <div className="shrink-0 text-right font-mono">
                <p className={i.precio_unitario == null ? "text-sm secundario" : "font-semibold text-emerald-300"}>{precioTexto(i.precio_unitario, i.moneda)}</p>
                {i.cantidad != null && (
                  <p className="text-xs secundario">
                    x {i.cantidad.toLocaleString("es")}
                    {i.unidad && ` ${i.unidad}`}
                  </p>
                )}
              </div>
            </div>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs secundario hover:text-acento">Corregir</summary>
              <form action={guardarItem.bind(null, presupuestoId, i.id)} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6">
                <input name="pn" defaultValue={i.pn ?? ""} placeholder="PN" className="campo-pn text-sm" />
                <input name="marca" defaultValue={i.marca ?? ""} placeholder="Marca" className="campo text-sm" />
                <input name="descripcion" defaultValue={i.descripcion ?? ""} placeholder="Descripción" className="campo col-span-2 text-sm" />
                <input name="cantidad" defaultValue={i.cantidad ?? ""} placeholder="Cant." inputMode="decimal" className="campo text-sm" />
                <input name="precio_unitario" defaultValue={i.precio_unitario ?? ""} placeholder="Precio unit." inputMode="decimal" className="campo text-sm" />
                <input name="moneda" defaultValue={i.moneda ?? ""} placeholder="Moneda" className="campo text-sm" />
                <select name="clase" defaultValue={i.clase} className="campo text-sm">
                  <option value="repuesto">Repuesto</option>
                  <option value="servicio">Servicio</option>
                </select>
                <div className="col-span-2 flex gap-2 sm:col-span-4">
                  <button className="boton-secundario">Guardar</button>
                  <button formAction={borrarItem.bind(null, presupuestoId, i.id)} className="chip border-red-400/40 text-red-300">
                    Borrar renglón
                  </button>
                </div>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
