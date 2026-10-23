import Link from "next/link";
import { redirect } from "next/navigation";
import { MOTIVO_TEXTO } from "@/lib/busqueda";
import { horaLocal, idiomaDe, linkLlamada, linkMail, linkWhatsapp } from "@/lib/contacto";
import { buscar, obtenerBusqueda } from "@/lib/datos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { BotonContacto } from "./boton-contacto";
import { CambiarEstado } from "./cambiar-estado";

type Params = { pn?: string; marca?: string; cantidad?: string; cliente?: string; id?: string };

export default async function Buscar({ searchParams }: { searchParams: Params }) {
  // Una búsqueda nueva se guarda en el historial y se redirige a su id, así recargar no la duplica.
  if (!searchParams.id) {
    const pn = (searchParams.pn ?? "").trim();
    if (!pn) redirect("/");
    const { data, error } = await clienteServidor()
      .from("busquedas")
      .insert({
        pn,
        marca: searchParams.marca?.trim() || null,
        cantidad: Number(searchParams.cantidad) || 1,
        cliente: searchParams.cliente?.trim() || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    redirect(`/buscar?id=${data.id}`);
  }

  const busqueda = await obtenerBusqueda(Number(searchParams.id));
  if (!busqueda) redirect("/");
  const marca = busqueda.marca ?? "";
  const resultados = await buscar(busqueda.pn, marca);
  const conPrecio = resultados.filter((r) => r.ultimaCotizacion).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            {busqueda.pn} {marca && <span className="text-slate-500">· {marca}</span>}
          </h1>
          <p className="text-sm text-slate-600">
            {resultados.length} proveedores · {conPrecio} con precio anterior
            {busqueda.cliente && ` · ${busqueda.cliente}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CambiarEstado id={busqueda.id} estado={busqueda.estado} />
          <a href={`/api/exportar?id=${busqueda.id}`} className="boton">
            Descargar Excel
          </a>
          <Link href={`/cotizaciones/nueva?pn=${encodeURIComponent(busqueda.pn)}&marca=${encodeURIComponent(marca)}&busqueda=${busqueda.id}`} className="boton-secundario">
            Cargar precio recibido
          </Link>
        </div>
      </div>

      {resultados.length === 0 && (
        <p className="tarjeta text-slate-600">
          No hay proveedores con este PN ni con esta marca en la base. Probá con otra marca o cargá proveedores nuevos.
        </p>
      )}

      <ul className="space-y-3">
        {resultados.map((r) => {
          const p = r.proveedor;
          const q = r.ultimaCotizacion;
          const idioma = idiomaDe(p.idioma, p.pais);
          const h = horaLocal(p.zona_horaria);
          return (
            <li key={p.id} className="tarjeta space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/proveedores/${p.id}`} className="font-semibold text-blue-800 hover:underline">
                    {p.empresa}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {[p.pais, p.ciudad, p.marcas].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-800">{MOTIVO_TEXTO[r.motivo]}</span>
                  {h && <p className={h.abierto ? "mt-1 text-green-700" : "mt-1 text-slate-500"}>{h.hora} {h.abierto ? "abierto" : "cerrado"}</p>}
                </div>
              </div>

              {q && (
                <p className="text-sm">
                  <span className="font-semibold">
                    {q.precio_unitario?.toLocaleString("es")} {q.moneda}
                  </span>{" "}
                  el {q.fecha} {q.condicion && `· ${q.condicion}`} {q.plazo_dias != null && `· ${q.plazo_dias} días`}
                  {r.cotizaciones.length > 1 && <span className="text-slate-500"> · {r.cotizaciones.length} precios registrados</span>}
                </p>
              )}

              {r.contactos.length === 0 ? (
                <p className="text-sm text-slate-500">Sin contactos cargados.</p>
              ) : (
                <ul className="space-y-2">
                  {r.contactos.slice(0, 3).map((c) => {
                    const consulta = { pn: busqueda.pn, marca, cantidad: busqueda.cantidad, nombreContacto: c.nombre?.split(" ")[0] };
                    const base = { busquedaId: busqueda.id, contactoId: c.id, proveedorId: p.id };
                    const wa = c.tiene_whatsapp !== "No" ? linkWhatsapp(c.telefono, consulta, idioma) : null;
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="mr-auto">
                          {c.nombre} {c.cargo && <span className="text-slate-500">· {c.cargo}</span>}
                          {c.canal_preferido && <span className="text-slate-500"> · prefiere {c.canal_preferido}</span>}
                        </span>
                        {wa && <BotonContacto {...base} canal="WhatsApp" href={wa} />}
                        {linkLlamada(c.telefono) && <BotonContacto {...base} canal="Llamada" href={linkLlamada(c.telefono)!} />}
                        {linkMail(c.email, consulta, idioma) && <BotonContacto {...base} canal="Email" href={linkMail(c.email, consulta, idioma)!} />}
                        {c.wechat && <span className="boton-secundario">WeChat: {c.wechat}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
