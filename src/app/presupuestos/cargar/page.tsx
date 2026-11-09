"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { archivoAceptado, EXTENSIONES, MAX_BYTES, rutaArchivo } from "@/lib/presupuestos";
import { clienteNavegador } from "@/lib/supabase/navegador";

type Fila = {
  clave: string;
  archivo: File;
  estado: "pendiente" | "subiendo" | "leyendo" | "listo" | "error";
  mensaje?: string;
  id?: number;
};

const EN_PARALELO = 3;
const ACEPTA = EXTENSIONES.map((e) => `.${e}`).join(",") + ",application/pdf,image/*";

async function leerConIA(id: number) {
  const r = await fetch("/api/presupuestos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ presupuestoId: id }) });
  const datos = await r.json().catch(() => ({ error: `Error ${r.status}` }));
  if (!r.ok) throw new Error(datos.error ?? `Error ${r.status}`);
  return datos as { repuestos: number; servicios: number; tipo: "propio" | "proveedor"; aviso: string | null };
}

export default function CargarPresupuestos() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [ocupado, setOcupado] = useState(false);

  const actualizar = (clave: string, cambio: Partial<Fila>) => setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  useEffect(() => {
    if (!ocupado) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [ocupado]);

  function elegir(lista: FileList | null) {
    if (!lista) return;
    const nuevas: Fila[] = Array.from(lista).map((archivo, i) => {
      const clave = `${Date.now()}-${i}-${archivo.name}`;
      if (!archivoAceptado(archivo.name)) return { clave, archivo, estado: "error", mensaje: "Formato no admitido. Usá PDF, foto, Excel (.xlsx) o CSV. Un Word se puede guardar como PDF." };
      if (archivo.size > MAX_BYTES) return { clave, archivo, estado: "error", mensaje: "Pesa más de 15 MB." };
      return { clave, archivo, estado: "pendiente" };
    });
    setFilas((fs) => [...fs, ...nuevas]);
  }

  async function procesar(f: Fila) {
    const supabase = clienteNavegador();
    try {
      let id = f.id;
      if (!id) {
        actualizar(f.clave, { estado: "subiendo", mensaje: undefined });
        const ruta = rutaArchivo(f.archivo.name);
        const { error: errorSubida } = await supabase.storage.from("presupuestos").upload(ruta, f.archivo, { contentType: f.archivo.type || undefined });
        if (errorSubida) throw new Error(`No se pudo guardar el archivo: ${errorSubida.message}`);
        const { data, error } = await supabase.from("presupuestos").insert({ archivo: ruta, nombre_archivo: f.archivo.name }).select("id").single();
        if (error) throw new Error(`No se pudo crear el presupuesto: ${error.message}`);
        id = data.id as number;
        actualizar(f.clave, { id });
      }
      actualizar(f.clave, { estado: "leyendo", mensaje: undefined });
      const r = await leerConIA(id);
      const partes = [r.tipo === "propio" ? "Nuestro presupuesto" : "De proveedor", `${r.repuestos} repuestos`, `${r.servicios} servicios`];
      actualizar(f.clave, { estado: "listo", mensaje: partes.join(" · ") + (r.aviso ? `. ${r.aviso}` : "") });
    } catch (e) {
      actualizar(f.clave, { estado: "error", mensaje: e instanceof Error ? e.message : String(e) });
    }
  }

  async function empezar() {
    setOcupado(true);
    // Los que fallaron al leer se reintentan; los de formato inválido no tienen id y siguen con error.
    const cola = filas.filter((f) => f.estado === "pendiente" || (f.estado === "error" && f.id));
    for (let i = 0; i < cola.length; i += EN_PARALELO) {
      await Promise.all(cola.slice(i, i + EN_PARALELO).map(procesar));
    }
    setOcupado(false);
  }

  const pendientes = filas.filter((f) => f.estado === "pendiente" || (f.estado === "error" && f.id)).length;
  const listos = filas.filter((f) => f.estado === "listo").length;

  return (
    <div className="space-y-4">
      <div className="tarjeta space-y-5 p-5 sm:p-6">
        <div>
          <p className="subtitulo text-amarillo">Presupuestos históricos</p>
          <h1 className="titulo mt-1">Cargar presupuestos</h1>
          <p className="mt-1 text-sm secundario">
            Elegí uno o varios presupuestos: los nuestros a clientes y los que nos mandaron proveedores o talleres. Sirven PDF, fotos, Excel (.xlsx) y CSV. La IA reconoce de quién es, la fecha, y separa los repuestos (con PN y precio) de los servicios, que pasan al módulo de Servicios. Cada uno tarda entre 10 y 40 segundos.
          </p>
        </div>
        <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-acento/50 p-6 text-center ${ocupado ? "pointer-events-none opacity-50" : "hover:bg-acento/5"}`}>
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-acento" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          <span className="text-sm text-white">Elegir archivos o sacar una foto</span>
          <span className="text-xs secundario">Hasta 15 MB cada uno</span>
          <input
            type="file"
            multiple
            accept={ACEPTA}
            className="hidden"
            disabled={ocupado}
            onChange={(e) => {
              elegir(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button className="boton" onClick={empezar} disabled={ocupado || pendientes === 0}>
            {ocupado ? "Leyendo..." : pendientes ? `Leer ${pendientes} con IA` : "Leer con IA"}
          </button>
          {!ocupado && filas.length > 0 && (
            <button className="boton-secundario" onClick={() => setFilas([])}>
              Limpiar lista
            </button>
          )}
        </div>
        {filas.length > 0 && (
          <ul className="divide-y divide-borde/60 border-t border-borde/60">
            {filas.map((f) => (
              <li key={f.clave} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="mr-auto min-w-0 break-all text-white">{f.archivo.name}</span>
                <EstadoFila fila={f} />
                {f.mensaje && <p className={`w-full text-xs ${f.estado === "error" ? "text-red-400" : "secundario"}`}>{f.mensaje}</p>}
              </li>
            ))}
          </ul>
        )}
        {!ocupado && listos > 0 && (
          <p className="text-sm text-emerald-300">
            {listos} {listos === 1 ? "presupuesto cargado" : "presupuestos cargados"}. Revisalos en la lista por si la IA leyó algo mal.
          </p>
        )}
      </div>
      <Link href="/presupuestos" className="enlace inline-block text-sm">
        ← Volver a presupuestos
      </Link>
    </div>
  );
}

function EstadoFila({ fila }: { fila: Fila }) {
  if (fila.estado === "subiendo" || fila.estado === "leyendo")
    return (
      <span className="flex items-center gap-1.5 font-mono text-xs secundario">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-acento border-t-transparent" />
        {fila.estado === "subiendo" ? "subiendo" : "leyendo con IA"}
      </span>
    );
  if (fila.estado === "listo" && fila.id)
    return (
      <Link href={`/presupuestos/${fila.id}`} className="chip border-emerald-400/40 text-emerald-300">
        Listo · ver
      </Link>
    );
  if (fila.estado === "error") return <span className="chip border-red-400/40 text-red-300">{fila.id ? "Error · se puede reintentar" : "No se carga"}</span>;
  return <span className="chip border-borde text-apagado">en espera</span>;
}
