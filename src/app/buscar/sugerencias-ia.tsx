"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { idiomaDe, linkLlamada, linkMail, linkWhatsapp } from "@/lib/contacto";
import type { SugerenciaIA } from "@/lib/ia";
import { agregarProveedorIA } from "./acciones";

type Estado =
  | { tipo: "inicial" }
  | { tipo: "buscando" }
  | { tipo: "listo"; proveedores: SugerenciaIA[]; fecha: string; guardada: boolean }
  | { tipo: "error"; mensaje: string };

const CHIP = "chip border-borde text-apagado";

export function SugerenciasIA(props: { busquedaId: number; pn: string; marca: string; cantidad: number | null; automatica: boolean }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "inicial" });
  const [agregados, setAgregados] = useState<Record<string, string>>({});

  async function buscar(forzar = false) {
    setEstado({ tipo: "buscando" });
    try {
      const r = await fetch("/api/sugerencias-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ busquedaId: props.busquedaId, forzar }),
      });
      const datos = await r.json().catch(() => ({}));
      if (r.status === 503 && datos.error === "falta_clave") {
        setEstado({ tipo: "error", mensaje: "Falta configurar la clave de IA (ANTHROPIC_API_KEY) en Vercel." });
      } else if (!r.ok) {
        setEstado({ tipo: "error", mensaje: datos.error ?? "La búsqueda con IA tardó demasiado o falló. Probá de nuevo." });
      } else {
        setEstado({ tipo: "listo", proveedores: datos.proveedores, fecha: datos.fecha, guardada: datos.guardada });
      }
    } catch {
      setEstado({ tipo: "error", mensaje: "No se pudo conectar. Revisá la conexión y probá de nuevo." });
    }
  }

  useEffect(() => {
    if (props.automatica) buscar();
    // Solo al abrir la búsqueda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function agregar(s: SugerenciaIA) {
    const r = await agregarProveedorIA(s, props.marca);
    if (r.id) setAgregados((a) => ({ ...a, [s.empresa]: r.id! }));
    else alert(r.error);
  }

  const consulta = { pn: props.pn, marca: props.marca, cantidad: props.cantidad };

  return (
    <section className="tarjeta relative space-y-4 overflow-hidden border-acento/30 pl-5">
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-acento to-fuchsia-400" aria-hidden />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="subtitulo text-amarillo">Búsqueda con IA</p>
          <h2 className="mt-1 font-semibold text-white">Proveedores alternativos en la web</h2>
          <p className="mt-1 text-sm secundario">
            {props.automatica
              ? "Este PN no está registrado en la base, así que la IA busca en la web quién lo vende."
              : "La IA busca en la web otros proveedores que vendan este PN o esta marca."}
          </p>
        </div>
        {estado.tipo === "inicial" && (
          <button onClick={() => buscar()} className="boton">
            Buscar con IA
          </button>
        )}
        {estado.tipo === "listo" && (
          <button onClick={() => buscar(true)} className="boton-secundario">
            Buscar de nuevo
          </button>
        )}
      </div>

      {estado.tipo === "buscando" && (
        <div className="flex items-center gap-3 font-mono text-sm text-acento">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-acento border-t-transparent" />
          Buscando en la web… puede tardar hasta un minuto.
        </div>
      )}

      {estado.tipo === "error" && <p className="text-sm text-red-400">{estado.mensaje}</p>}

      {estado.tipo === "listo" && (
        <>
          <p className="font-mono text-xs secundario">
            {estado.proveedores.length} encontrados · {estado.guardada ? "resultado guardado del " : "buscado el "}
            {estado.fecha.slice(0, 10)} · verificá los datos antes de comprar
          </p>
          {estado.proveedores.length === 0 && <p className="text-sm secundario">La IA no encontró proveedores confiables para este repuesto.</p>}
          <ul className="space-y-3">
            {estado.proveedores.map((s) => {
              const idioma = idiomaDe(null, s.pais);
              const wa = linkWhatsapp(s.whatsapp, consulta, idioma);
              const tel = linkLlamada(s.telefono ?? s.whatsapp);
              const mail = linkMail(s.email, consulta, idioma);
              const id = agregados[s.empresa];
              return (
                <li key={s.empresa + s.fuente} className="rounded-md border border-borde bg-fondo/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{s.empresa}</span>
                    {s.lista_el_pn && <span className="chip border-emerald-400/40 bg-emerald-400/10 text-emerald-300">Lista el PN</span>}
                    <span className={CHIP}>{s.tipo}</span>
                  </div>
                  <p className="mt-0.5 font-mono text-xs secundario">{[s.pais, s.ciudad].filter(Boolean).join(" · ")}</p>
                  <p className="mt-2 text-sm text-slate-300">{s.motivo}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    {wa && <a href={wa} target="_blank" rel="noreferrer" className="chip border-emerald-400/40 bg-emerald-400/10 py-1.5 text-emerald-300">WhatsApp</a>}
                    {tel && <a href={tel} className="chip border-slate-400/40 bg-slate-400/10 py-1.5 text-slate-200">Llamar</a>}
                    {mail && <a href={mail} className="chip border-cyan-400/40 bg-cyan-400/10 py-1.5 text-cyan-300">Email</a>}
                    {s.web && (
                      <a href={s.web.startsWith("http") ? s.web : `https://${s.web}`} target="_blank" rel="noreferrer" className={`${CHIP} py-1.5`}>
                        Web
                      </a>
                    )}
                    <a href={s.fuente} target="_blank" rel="noreferrer" className={`${CHIP} py-1.5`}>
                      Fuente
                    </a>
                    <span className="ml-auto">
                      {id ? (
                        <Link href={`/proveedores/${id}`} className="enlace text-sm">
                          Agregado como {id} →
                        </Link>
                      ) : (
                        <button onClick={() => agregar(s)} className="boton-secundario py-1.5">
                          + Agregar a mis proveedores
                        </button>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
