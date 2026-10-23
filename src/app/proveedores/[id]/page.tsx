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
        <h1 className="text-xl font-bold">{prov.empresa}</h1>
        <p className="text-slate-600">{[prov.pais, prov.ciudad, prov.tipo, prov.marcas].filter(Boolean).join(" · ")}</p>
        {prov.productos && <p>{prov.productos}</p>}
        {prov.web && (
          <a href={prov.web.startsWith("http") ? prov.web : `https://${prov.web}`} target="_blank" rel="noreferrer" className="text-blue-700 underline">
            {prov.web}
          </a>
        )}
        {prov.notas && <p className="whitespace-pre-line pt-2 text-sm text-slate-700">{prov.notas}</p>}
      </div>

      <section className="tarjeta">
        <h2 className="mb-2 font-semibold">Contactos</h2>
        <ul className="space-y-2 text-sm">
          {contactos.map((x) => {
            const tel = normalizarTelefono(x.telefono);
            return (
              <li key={x.id} className="flex flex-wrap items-center gap-2">
                <span className="mr-auto">
                  {x.nombre} {x.cargo && <span className="text-slate-500">· {x.cargo}</span>}
                </span>
                {tel && x.tiene_whatsapp !== "No" && (
                  <a href={`https://wa.me/${tel.slice(1)}`} target="_blank" rel="noreferrer" className="boton-secundario">WhatsApp</a>
                )}
                {linkLlamada(x.telefono) && <a href={linkLlamada(x.telefono)!} className="boton-secundario">{tel}</a>}
                {x.email && <a href={`mailto:${x.email}`} className="boton-secundario">{x.email}</a>}
              </li>
            );
          })}
          {contactos.length === 0 && <li className="text-slate-500">Sin contactos.</li>}
        </ul>
      </section>

      <section className="tarjeta overflow-x-auto">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Precios registrados ({cotizaciones.length})</h2>
          <Link href={`/cotizaciones/nueva?proveedor=${prov.id}`} className="boton-secundario">Cargar precio</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-1 pr-2">Fecha</th>
              <th className="py-1 pr-2">PN</th>
              <th className="py-1 pr-2">Descripción</th>
              <th className="py-1 pr-2">Precio</th>
              <th className="py-1 pr-2">Condición</th>
              <th className="py-1">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {cotizaciones.map((x) => (
              <tr key={x.id} className="border-t border-slate-100">
                <td className="py-1 pr-2 whitespace-nowrap">{x.fecha}</td>
                <td className="py-1 pr-2">{x.pn}</td>
                <td className="py-1 pr-2">{x.descripcion}</td>
                <td className="py-1 pr-2 whitespace-nowrap">{x.precio_unitario?.toLocaleString("es")} {x.moneda}</td>
                <td className="py-1 pr-2">{x.condicion}</td>
                <td className="py-1 text-slate-500">{x.tipo_precio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
