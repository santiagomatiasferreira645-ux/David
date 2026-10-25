import Link from "next/link";
import { redirect } from "next/navigation";
import { horaLocal, idiomaDe, linkLlamada, linkMail, linkWhatsapp } from "@/lib/contacto";
import { buscar, obtenerBusqueda } from "@/lib/datos";
import { imagenesDelPn } from "@/lib/imagenes";
import { clienteServidor } from "@/lib/supabase/servidor";
import { Estado, MOTIVO_COLOR, MotivoChip } from "../insignias";
import { BotonContacto } from "./boton-contacto";
import { CambiarEstado } from "./cambiar-estado";
import { ImagenesPn } from "./imagenes-pn";
import { SugerenciasIA } from "./sugerencias-ia";

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
  const [resultados, imagenes] = await Promise.all([buscar(busqueda.pn, marca), imagenesDelPn(busqueda.pn)]);
  const conPrecio = resultados.filter((r) => r.ultimaCotizacion).length;
  // Si nadie cotizó ni fue consultado por este PN, la IA busca alternativas en la web sola.
  const pnRegistrado = resultados.some((r) => r.motivo !== "maneja_la_marca");
  const ia = (
    <SugerenciasIA busquedaId={busqueda.id} pn={busqueda.pn} marca={marca} cantidad={busqueda.cantidad} automatica={!pnRegistrado} />
  );

  return (
    <div className="space-y-4">
      <div className="tarjeta flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <p className="subtitulo">Resultados{busqueda.cliente && ` · ${busqueda.cliente}`}</p>
          <h1 className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="pn text-2xl font-semibold text-white sm:text-3xl">{busqueda.pn}</span>
            {marca && <span className="font-mono text-lg text-acento">{marca}</span>}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4 font-mono text-sm">
            <span>
              <span className="text-white">{resultados.length}</span> <span className="secundario">proveedores</span>
            </span>
            <span>
              <span className="text-emerald-300">{conPrecio}</span> <span className="secundario">con precio anterior</span>
            </span>
            <Estado estado={busqueda.estado} />
          </div>
          <div className="mt-4">
            <ImagenesPn pn={busqueda.pn} imagenes={imagenes} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CambiarEstado id={busqueda.id} estado={busqueda.estado} />
          <a href={`/api/exportar?id=${busqueda.id}`} className="boton">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
            </svg>
            Excel
          </a>
          <Link href={`/cotizaciones/nueva?pn=${encodeURIComponent(busqueda.pn)}&marca=${encodeURIComponent(marca)}&busqueda=${busqueda.id}`} className="boton-secundario">
            + Cargar precio
          </Link>
        </div>
      </div>

      {resultados.length === 0 && (
        <p className="tarjeta secundario">No hay proveedores con este PN ni con esta marca en la base.</p>
      )}

      {!pnRegistrado && ia}

      {!pnRegistrado && resultados.length > 0 && (
        <p className="subtitulo pt-2">En la base: proveedores que manejan la marca</p>
      )}

      <ul className="space-y-3">
        {resultados.map((r) => {
          const p = r.proveedor;
          const q = r.ultimaCotizacion;
          const idioma = idiomaDe(p.idioma, p.pais);
          const h = horaLocal(p.zona_horaria);
          return (
            <li key={p.id} className="tarjeta relative overflow-hidden pl-5">
              <span className={`absolute inset-y-0 left-0 w-1 ${MOTIVO_COLOR[r.motivo].barra}`} aria-hidden />
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/proveedores/${p.id}`} className="text-base font-semibold text-white hover:text-acento">
                      {p.empresa}
                    </Link>
                    <MotivoChip motivo={r.motivo} />
                  </div>
                  <p className="text-sm secundario">{[p.pais, p.ciudad, p.marcas].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex items-start gap-4 md:justify-end">
                  {q && (
                    <div className="md:text-right">
                      <p className="font-mono text-xl font-semibold text-emerald-300">
                        {q.precio_unitario?.toLocaleString("es")} <span className="text-sm text-emerald-300/70">{q.moneda}</span>
                      </p>
                      <p className="font-mono text-xs secundario">
                        {q.fecha}
                        {q.condicion && ` · ${q.condicion}`}
                        {q.plazo_dias != null && ` · ${q.plazo_dias} d`}
                        {r.cotizaciones.length > 1 && ` · ${r.cotizaciones.length} precios`}
                      </p>
                    </div>
                  )}
                  {h && (
                    <div className="ml-auto text-right font-mono text-xs md:ml-0">
                      <p className="text-sm text-white">{h.hora}</p>
                      <p className={`flex items-center justify-end gap-1 ${h.abierto ? "text-emerald-300" : "secundario"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${h.abierto ? "bg-emerald-400" : "bg-slate-500"}`} />
                        {h.abierto ? "abierto" : "cerrado"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {r.contactos.length === 0 ? (
                <p className="mt-3 text-sm secundario">Sin contactos cargados.</p>
              ) : (
                <ul className="mt-3 divide-y divide-borde/60 border-t border-borde/60">
                  {r.contactos.slice(0, 3).map((c) => {
                    const consulta = { pn: busqueda.pn, marca, cantidad: busqueda.cantidad, nombreContacto: c.nombre?.split(" ")[0] };
                    const base = { busquedaId: busqueda.id, contactoId: c.id, proveedorId: p.id };
                    const wa = c.tiene_whatsapp !== "No" ? linkWhatsapp(c.telefono, consulta, idioma) : null;
                    return (
                      <li key={c.id} className="flex flex-wrap items-center gap-2 pt-2 text-sm [&:not(:first-child)]:mt-2">
                        <span className="mr-auto">
                          {c.nombre} {c.cargo && <span className="secundario">· {c.cargo}</span>}
                          {c.canal_preferido && <span className="secundario"> · prefiere {c.canal_preferido}</span>}
                        </span>
                        {wa && <BotonContacto {...base} canal="WhatsApp" href={wa} />}
                        {linkLlamada(c.telefono) && <BotonContacto {...base} canal="Llamada" href={linkLlamada(c.telefono)!} />}
                        {linkMail(c.email, consulta, idioma) && <BotonContacto {...base} canal="Email" href={linkMail(c.email, consulta, idioma)!} />}
                        {c.wechat && <span className="chip border-borde text-apagado">WeChat {c.wechat}</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {pnRegistrado && ia}
    </div>
  );
}
