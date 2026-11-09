import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MONEDAS, TIPOS_CLIENTE, formatoPrecio, listaDominios, margenDe } from "@/lib/clientes";
import { linkLlamada } from "@/lib/contacto";
import { historialCliente, sugerenciaPara } from "@/lib/datos-clientes";
import { normalizarPn, normalizarTelefono } from "@/lib/pn";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Cliente, ContactoCliente, PrecioCliente } from "@/lib/tipos";
import { Campo, Lista, lector } from "../campos";

const WHATSAPP = ["No sé", "Sí", "No"];
const FUENTE: Record<string, string> = {
  acordado: "Precio acordado",
  ultima_venta: "Última venta",
  ultimo_presupuesto: "Último presupuesto",
  margen: "Costo + margen",
};
const COLOR_ESTADO: Record<string, string> = {
  Vendido: "border-emerald-400/40 text-emerald-300",
  Presupuestado: "border-acento/40 text-acento",
  Perdido: "border-borde text-apagado",
};

export default async function FichaCliente({ params, searchParams }: { params: { id: string }; searchParams: { pn?: string } }) {
  const supabase = clienteServidor();
  const [c, k, pa, historial] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("clientes_contactos").select("*").eq("cliente_id", params.id).order("nombre"),
    supabase.from("precios_cliente").select("*").eq("cliente_id", params.id).order("pn"),
    historialCliente(params.id),
  ]);
  if (!c.data) notFound();
  const cliente = c.data as Cliente;
  const contactos = (k.data ?? []) as ContactoCliente[];
  const acordados = (pa.data ?? []) as PrecioCliente[];

  const pn = searchParams.pn?.trim();
  const delPn = pn ? historial.filter((h) => h.pn && normalizarPn(h.pn) === normalizarPn(pn)) : [];
  const sugerencia = pn ? await sugerenciaPara(cliente, pn, delPn) : null;

  const vendido = new Map<string, number>();
  historial
    .filter((h) => h.estado === "Vendido" && h.precio_unitario != null)
    .forEach((h) => vendido.set(h.moneda ?? "", (vendido.get(h.moneda ?? "") ?? 0) + h.precio_unitario! * (h.cantidad ?? 1)));

  const id = cliente.id;
  const ruta = `/clientes/${id}`;

  async function editar(form: FormData) {
    "use server";
    const { txt, num } = lector(form);
    const { error } = await clienteServidor()
      .from("clientes")
      .update({
        empresa: txt("empresa") ?? undefined,
        razon_social: txt("razon_social"),
        ruc: txt("ruc"),
        pais: txt("pais"),
        ciudad: txt("ciudad"),
        tipo: txt("tipo"),
        moneda: txt("moneda") ?? "USD",
        condicion_pago: txt("condicion_pago"),
        margen_pct: num("margen_pct"),
        dominios: listaDominios(txt("dominios")).join(", ") || null,
        notas: txt("notas"),
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath(ruta);
    redirect(ruta);
  }

  async function agregarContacto(form: FormData) {
    "use server";
    const { txt } = lector(form);
    const telefono = txt("telefono");
    const { error } = await clienteServidor().from("clientes_contactos").insert({
      cliente_id: id,
      nombre: txt("nombre"),
      cargo: txt("cargo"),
      email: txt("email"),
      telefono: normalizarTelefono(telefono) || telefono,
      tiene_whatsapp: txt("whatsapp") ?? "No sé",
      origen: "App",
    });
    if (error) throw error;
    revalidatePath(ruta);
  }

  async function guardarAcordado(form: FormData) {
    "use server";
    const { txt, num } = lector(form);
    const { error } = await clienteServidor()
      .from("precios_cliente")
      .upsert(
        {
          cliente_id: id,
          pn: txt("pn"),
          marca: txt("marca"),
          descripcion: txt("descripcion"),
          precio: num("precio"),
          moneda: txt("moneda") ?? "USD",
          vigente_hasta: txt("vigente_hasta"),
          notas: txt("notas"),
        },
        { onConflict: "cliente_id,pn_normalizado" },
      );
    if (error) throw error;
    revalidatePath(ruta);
  }

  async function borrarAcordado(form: FormData) {
    "use server";
    await clienteServidor().from("precios_cliente").delete().eq("id", Number(form.get("id"))).eq("cliente_id", id);
    revalidatePath(ruta);
  }

  return (
    <div className="space-y-4">
      <div className="tarjeta space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="subtitulo">{cliente.id}</p>
            <h1 className="titulo text-2xl">{cliente.empresa}</h1>
            <p className="font-mono text-sm secundario">{[cliente.pais, cliente.ciudad, cliente.tipo].filter(Boolean).join(" · ")}</p>
            {(cliente.razon_social || cliente.ruc) && (
              <p className="text-sm text-slate-300">{[cliente.razon_social, cliente.ruc && `RUC ${cliente.ruc}`].filter(Boolean).join(" · ")}</p>
            )}
          </div>
          <Link href={`${ruta}/venta`} className="boton">
            + Registrar venta
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="chip border-borde text-texto">{cliente.moneda}</span>
          {cliente.margen_pct != null && <span className="chip border-amarillo/40 text-amarillo">Margen +{cliente.margen_pct}%</span>}
          {cliente.condicion_pago && <span className="chip border-borde text-apagado">{cliente.condicion_pago}</span>}
          {Array.from(vendido).map(([m, total]) => (
            <span key={m} className="chip border-emerald-400/40 text-emerald-300">
              Vendido {formatoPrecio(total, m)}
            </span>
          ))}
        </div>
        {cliente.dominios && <p className="font-mono text-xs secundario">@ {cliente.dominios}</p>}
        {cliente.notas && <p className="whitespace-pre-line border-t border-borde pt-3 text-sm secundario">{cliente.notas}</p>}
        <details className="border-t border-borde pt-3">
          <summary className="cursor-pointer text-sm text-acento">Editar datos y condiciones</summary>
          <form action={editar} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo nombre="empresa" texto="Empresa" valor={cliente.empresa} requerido clase="sm:col-span-2" />
            <Campo nombre="razon_social" texto="Razón social" valor={cliente.razon_social} />
            <Campo nombre="ruc" texto="RUC / CUIT / CNPJ" valor={cliente.ruc} />
            <Campo nombre="pais" texto="País" valor={cliente.pais} />
            <Campo nombre="ciudad" texto="Ciudad" valor={cliente.ciudad} />
            <Lista nombre="tipo" texto="Tipo" opciones={TIPOS_CLIENTE} valor={cliente.tipo ?? ""} vacio />
            <Campo nombre="dominios" texto="Dominios de mail" valor={cliente.dominios} />
            <Lista nombre="moneda" texto="Moneda" opciones={MONEDAS} valor={cliente.moneda} />
            <Campo nombre="margen_pct" texto="Margen sobre costo (%)" tipo="number" valor={cliente.margen_pct} />
            <Campo nombre="condicion_pago" texto="Condición de pago" valor={cliente.condicion_pago} clase="sm:col-span-2" />
            <div className="sm:col-span-2">
              <label className="etiqueta" htmlFor="notas">Notas</label>
              <textarea id="notas" name="notas" rows={3} defaultValue={cliente.notas ?? ""} className="campo" />
            </div>
            <button className="boton sm:w-max">Guardar cambios</button>
          </form>
        </details>
      </div>

      <section className="tarjeta space-y-3">
        <h2 className="subtitulo text-amarillo">Precio para este cliente</h2>
        <form className="flex gap-2">
          <input name="pn" defaultValue={pn} placeholder="PN" className="campo-pn min-w-0 flex-1" required />
          <button className="boton">Ver precio</button>
        </form>
        {pn && (
          <div className="space-y-2">
            {sugerencia ? (
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-3xl font-semibold text-emerald-300">{formatoPrecio(sugerencia.precio, sugerencia.moneda)}</p>
                  <p className="text-sm secundario">
                    <span className="text-texto">{FUENTE[sugerencia.fuente]}</span> · {sugerencia.detalle}
                  </p>
                </div>
                <Link href={`${ruta}/venta?pn=${encodeURIComponent(pn)}&precio=${sugerencia.precio}&moneda=${sugerencia.moneda}`} className="boton-secundario">
                  Registrar con este precio
                </Link>
              </div>
            ) : (
              <p className="text-sm secundario">
                No hay precio acordado ni ventas de <span className="pn text-texto">{pn}</span> a este cliente
                {cliente.margen_pct == null ? ", y no tiene margen cargado para calcularlo sobre el costo." : ", ni costo cotizado para aplicarle el margen."}{" "}
                <Link href={`/buscar?pn=${encodeURIComponent(pn)}&cliente=${encodeURIComponent(cliente.empresa)}`} className="enlace">
                  Buscar proveedores
                </Link>
              </p>
            )}
            {delPn.length > 0 && <TablaHistorial filas={delPn} />}
          </div>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="subtitulo mb-3">Contactos · {contactos.length}</h2>
        <ul className="space-y-2 text-sm">
          {contactos.map((x) => {
            const tel = normalizarTelefono(x.telefono);
            return (
              <li key={x.id} className="flex flex-wrap items-center gap-2">
                <span className="mr-auto">
                  {x.nombre} {x.cargo && <span className="secundario">· {x.cargo}</span>}
                  {!tel && x.telefono && <span className="font-mono text-xs secundario"> · {x.telefono}</span>}
                </span>
                {tel && x.tiene_whatsapp !== "No" && (
                  <a href={`https://wa.me/${tel.slice(1)}`} target="_blank" rel="noreferrer" className="boton-secundario">WhatsApp</a>
                )}
                {linkLlamada(x.telefono) && <a href={linkLlamada(x.telefono)!} className="boton-secundario font-mono">{tel}</a>}
                {x.email && <a href={`mailto:${x.email}`} className="boton-secundario break-all">{x.email}</a>}
              </li>
            );
          })}
          {contactos.length === 0 && <li className="secundario">Sin contactos.</li>}
        </ul>
        <details className="mt-3 border-t border-borde pt-3">
          <summary className="cursor-pointer text-sm text-acento">Agregar contacto</summary>
          <form action={agregarContacto} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo nombre="nombre" texto="Nombre" requerido />
            <Campo nombre="cargo" texto="Cargo" />
            <Campo nombre="email" texto="Email" tipo="email" />
            <Campo nombre="telefono" texto="Teléfono, con código de país" tipo="tel" ejemplo="+595 981 123456" />
            <Lista nombre="whatsapp" texto="¿Tiene WhatsApp?" opciones={WHATSAPP} />
            <button className="boton self-end sm:w-max">Agregar</button>
          </form>
        </details>
      </section>

      <section className="tarjeta overflow-x-auto">
        <h2 className="subtitulo mb-3">Precios acordados · {acordados.length}</h2>
        {acordados.length > 0 && (
          <table className="tabla">
            <thead>
              <tr>
                <th>PN</th>
                <th>Descripción</th>
                <th>Precio</th>
                <th>Vigente hasta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {acordados.map((a) => (
                <tr key={a.id}>
                  <td className="pn whitespace-nowrap">{a.pn}</td>
                  <td>{[a.marca, a.descripcion].filter(Boolean).join(" · ")}</td>
                  <td className="whitespace-nowrap font-mono text-emerald-300">{formatoPrecio(a.precio, a.moneda)}</td>
                  <td className="whitespace-nowrap font-mono text-xs secundario">{a.vigente_hasta ?? "—"}</td>
                  <td>
                    <form action={borrarAcordado}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-xs text-apagado hover:text-red-400" aria-label={`Quitar precio de ${a.pn}`}>Quitar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <details className="mt-3 border-t border-borde pt-3">
          <summary className="cursor-pointer text-sm text-acento">Acordar un precio</summary>
          <form action={guardarAcordado} className="mt-4 grid gap-4 sm:grid-cols-3">
            <Campo nombre="pn" texto="PN" requerido />
            <Campo nombre="marca" texto="Marca" />
            <Campo nombre="descripcion" texto="Descripción" />
            <Campo nombre="precio" texto="Precio unitario" tipo="number" requerido />
            <Lista nombre="moneda" texto="Moneda" opciones={MONEDAS} valor={cliente.moneda} />
            <Campo nombre="vigente_hasta" texto="Vigente hasta" tipo="date" />
            <button className="boton self-end sm:w-max">Guardar precio</button>
          </form>
        </details>
      </section>

      <section className="tarjeta overflow-x-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="subtitulo">Ventas y presupuestos · {historial.length}</h2>
          <Link href={`${ruta}/venta`} className="boton-secundario">+ Registrar</Link>
        </div>
        {historial.length > 0 ? <TablaHistorial filas={historial} /> : <p className="text-sm secundario">Todavía no hay ventas registradas.</p>}
      </section>
    </div>
  );
}

function TablaHistorial({ filas }: { filas: Awaited<ReturnType<typeof historialCliente>> }) {
  return (
    <table className="tabla">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Estado</th>
          <th>PN</th>
          <th>Descripción</th>
          <th>Cant.</th>
          <th>Precio</th>
          <th>Margen</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((h) => {
          const m = margenDe(h.precio_unitario, h.costo_unitario);
          return (
            <tr key={h.id}>
              <td className="whitespace-nowrap font-mono text-xs secundario">
                {h.fecha}
                {h.comprobante && <span className="block">{h.comprobante}</span>}
              </td>
              <td>
                <span className={`chip ${COLOR_ESTADO[h.estado]}`}>{h.estado}</span>
              </td>
              <td className="pn whitespace-nowrap">{h.pn}</td>
              <td>
                {[h.marca, h.descripcion].filter(Boolean).join(" · ")}
                {h.embarcacion && <span className="block text-xs secundario">{h.embarcacion}</span>}
              </td>
              <td className="font-mono">{h.cantidad ?? ""}</td>
              <td className="whitespace-nowrap font-mono text-emerald-300">{formatoPrecio(h.precio_unitario, h.moneda)}</td>
              <td className="whitespace-nowrap font-mono text-xs">{m != null ? <span className={m < 0 ? "text-red-400" : "text-amarillo"}>{m}%</span> : ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
