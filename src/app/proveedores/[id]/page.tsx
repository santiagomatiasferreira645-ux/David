import Link from "next/link";
import { notFound } from "next/navigation";
import { ordenarContactos } from "@/lib/busqueda";
import { linkLlamada } from "@/lib/contacto";
import { normalizarTelefono } from "@/lib/pn";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Contacto, Cotizacion, Proveedor } from "@/lib/tipos";

export default async function DetalleProveedor({ params }: { params: { id: string } }) {
  const supabase = clienteServidor();
  const [p, c, q] = await Promise.all([
    supabase.from("proveedores").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("contactos").select("*").eq("proveedor_id", params.id),
    supabase.from("cotizaciones").select("*").eq("proveedor_id", params.id).order("fecha", { ascending: false }).limit(200),
  ]);
  if (!p.data) notFound();
  const prov = p.data as Proveedor;
  const contactos = ordenarContactos((c.data ?? []) as Contacto[]);
  const cotizaciones = (q.data ?? []) as Cotizacion[];

  return (
    <div className="space-y-4">
      <div className="tarjeta space-y-1">
        <p className="subtitulo">{prov.id}</p>
        <h1 className="titulo text-2xl">{prov.empresa}</h1>
        <p className="font-mono text-sm secundario">{[prov.pais, prov.ciudad, prov.tipo, prov.marcas].filter(Boolean).join(" · ")}</p>
        {prov.productos && <p className="pt-1 text-slate-300">{prov.productos}</p>}
        {prov.web && (
          <a href={prov.web.startsWith("http") ? prov.web : `https://${prov.web}`} target="_blank" rel="noreferrer" className="enlace font-mono text-sm">
            {prov.web}
          </a>
        )}
        {prov.notas && <p className="mt-2 whitespace-pre-line border-t border-borde pt-3 text-sm secundario">{prov.notas}</p>}
      </div>

      <section className="tarjeta">
        <h2 className="subtitulo mb-3">Contactos</h2>
        <ul className="space-y-2 text-sm">
          {contactos.map((x) => {
            const tel = normalizarTelefono(x.telefono);
            return (
              <li key={x.id} className="flex flex-wrap items-center gap-2">
                <span className="mr-auto">
                  {x.nombre} {x.cargo && <span className="secundario">· {x.cargo}</span>}
                </span>
                {tel && x.tiene_whatsapp !== "No" && (
                  <a href={`https://wa.me/${tel.slice(1)}`} target="_blank" rel="noreferrer" className="boton-secundario">WhatsApp</a>
                )}
                {linkLlamada(x.telefono) && <a href={linkLlamada(x.telefono)!} className="boton-secundario font-mono">{tel}</a>}
                {x.email && <a href={`mailto:${x.email}`} className="boton-secundario">{x.email}</a>}
              </li>
            );
          })}
          {contactos.length === 0 && <li className="secundario">Sin contactos.</li>}
        </ul>
      </section>

      <section className="tarjeta overflow-x-auto">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="subtitulo">Precios registrados · {cotizaciones.length}</h2>
          <Link href={`/cotizaciones/nueva?proveedor=${prov.id}`} className="boton-secundario">Cargar precio</Link>
        </div>
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>PN</th>
              <th>Descripción</th>
              <th>Precio</th>
              <th>Condición</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {cotizaciones.map((x) => (
              <tr key={x.id}>
                <td className="whitespace-nowrap font-mono text-xs secundario">{x.fecha}</td>
                <td className="pn">{x.pn}</td>
                <td>{x.descripcion}</td>
                <td className="whitespace-nowrap font-mono text-emerald-300">{x.precio_unitario?.toLocaleString("es")} {x.moneda}</td>
                <td>{x.condicion}</td>
                <td className="text-xs secundario">{x.tipo_precio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
