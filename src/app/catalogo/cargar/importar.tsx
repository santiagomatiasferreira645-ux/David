"use client";

import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

// Archivo de catálogo ya procesado (lo prepara Claude por el chat): las filas van como
// [pn, descripcion, lista, titulo, pagina, nota] para que el archivo pese menos.
type CatalogoListo = { nombre: string; archivo: string; paginas: number | null; filas: [string, string | null, string | null, string | null, number | null, string | null][] };

const TANDA = 1000;

function leerCatalogos(texto: string): CatalogoListo[] {
  const datos = JSON.parse(texto);
  const lista = Array.isArray(datos) ? datos : [datos];
  if (!lista.every((c) => typeof c?.nombre === "string" && typeof c?.archivo === "string" && Array.isArray(c?.filas))) {
    throw new Error("formato");
  }
  return lista;
}

export function ImportarCatalogos({ existentes, ocupado, alTerminar }: { existentes: string[]; ocupado: boolean; alTerminar: () => void }) {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [trabajando, setTrabajando] = useState(false);
  const [avance, setAvance] = useState("");
  const [mensajes, setMensajes] = useState<{ texto: string; error?: boolean }[]>([]);

  async function importar(e: React.FormEvent) {
    e.preventDefault();
    const supabase = clienteNavegador();
    const yaCargados = new Set(existentes.map((n) => n.toLowerCase()));
    const salida: typeof mensajes = [];
    setTrabajando(true);
    setMensajes([]);

    for (const archivo of archivos) {
      let catalogos: CatalogoListo[];
      try {
        catalogos = leerCatalogos(await archivo.text());
      } catch {
        salida.push({ texto: `${archivo.name}: no es un archivo de catálogo válido.`, error: true });
        continue;
      }
      for (const c of catalogos) {
        if (yaCargados.has(c.nombre.toLowerCase())) {
          salida.push({ texto: `${c.nombre}: ya estaba cargado, no se tocó.` });
          continue;
        }
        const { data, error } = await supabase
          .from("catalogos")
          .insert({ nombre: c.nombre, archivo: c.archivo, paginas: c.paginas })
          .select("id")
          .single();
        if (error) {
          salida.push({ texto: `${c.nombre}: ${error.message}`, error: true });
          continue;
        }
        let fallo = "";
        for (let i = 0; i < c.filas.length; i += TANDA) {
          setAvance(`${c.nombre}: ${Math.min(i + TANDA, c.filas.length).toLocaleString("es")} de ${c.filas.length.toLocaleString("es")} PN`);
          const filas = c.filas.slice(i, i + TANDA).map(([pn, descripcion, lista, titulo, pagina, nota]) => ({
            catalogo: c.nombre,
            archivo: c.archivo,
            pn,
            descripcion,
            lista,
            titulo,
            pagina,
            nota,
          }));
          const { error: errorFilas } = await supabase.from("catalogo_pn").insert(filas);
          if (errorFilas) {
            fallo = errorFilas.message;
            break;
          }
        }
        if (fallo) {
          // Queda a medias: se borra para poder importarlo de nuevo limpio.
          await supabase.from("catalogo_pn").delete().eq("catalogo", c.nombre);
          await supabase.from("catalogos").delete().eq("id", data.id);
          salida.push({ texto: `${c.nombre}: se cortó (${fallo}). Probá importarlo de nuevo.`, error: true });
          continue;
        }
        await supabase.from("catalogos").update({ estado: "listo", pagina_procesada: c.paginas ?? 0 }).eq("id", data.id);
        yaCargados.add(c.nombre.toLowerCase());
        salida.push({ texto: `${c.nombre}: ${c.filas.length.toLocaleString("es")} PN cargados.` });
      }
    }

    setAvance("");
    setMensajes(salida);
    setTrabajando(false);
    alTerminar();
  }

  return (
    <form onSubmit={importar} className="tarjeta space-y-4 p-5 sm:p-6">
      <div>
        <p className="subtitulo">Catálogos ya procesados</p>
        <p className="mt-1 text-sm secundario">
          Si Claude te pasó un archivo .json con los PN de uno o varios catálogos, subilo acá. No usa IA y tarda menos de un minuto.
        </p>
      </div>
      <input
        type="file"
        accept=".json,application/json"
        multiple
        required
        disabled={trabajando || ocupado}
        onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
        className="campo file:mr-3 file:rounded file:border-0 file:bg-acento/15 file:px-3 file:py-1 file:text-acento"
      />
      <button className="boton" disabled={trabajando || ocupado || archivos.length === 0}>
        Importar
      </button>
      {avance && (
        <p className="flex items-center gap-2 text-sm secundario">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-acento border-t-transparent" />
          {avance}
        </p>
      )}
      {mensajes.length > 0 && (
        <ul className="space-y-1 text-sm">
          {mensajes.map((m, i) => (
            <li key={i} className={m.error ? "text-red-400" : "text-emerald-300"}>
              {m.texto}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
