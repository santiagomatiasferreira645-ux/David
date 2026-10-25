"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pareceListaDePartes, textoDePagina } from "@/lib/pdf-texto";
import { clienteNavegador } from "@/lib/supabase/navegador";

type Catalogo = { id: number; nombre: string; archivo: string; paginas: number | null; pagina_procesada: number; estado: "procesando" | "listo" };
type Tanda = { pagina: number; texto: string }[];

const BUCKET = "catalogos";
const MAX_PAGINAS_TANDA = 4;
const MAX_CARACTERES_TANDA = 12000;
const EN_PARALELO = 4;

// "CAT 3516 · Parts Manual" -> "cat-3516-parts-manual.pdf"
function nombreArchivo(nombre: string): string {
  const base = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base || "catalogo"}.pdf`;
}

async function abrirPdf(archivo: File): Promise<PDFDocumentProxy> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
  return pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) }).promise;
}

// Agrupa páginas seguidas en tandas chicas, para que cada lectura con IA entre en el minuto que da Vercel.
function armarTandas(paginas: Tanda): Tanda[] {
  const tandas: Tanda[] = [];
  let actual: Tanda = [];
  let caracteres = 0;
  for (const p of paginas) {
    const texto = p.texto.slice(0, MAX_CARACTERES_TANDA);
    if (actual.length && (actual.length >= MAX_PAGINAS_TANDA || caracteres + texto.length > MAX_CARACTERES_TANDA)) {
      tandas.push(actual);
      actual = [];
      caracteres = 0;
    }
    actual.push({ pagina: p.pagina, texto });
    caracteres += texto.length;
  }
  if (actual.length) tandas.push(actual);
  return tandas;
}

async function procesarTanda(catalogoId: number, paginas: Tanda): Promise<number> {
  const r = await fetch("/api/catalogo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ catalogoId, paginas }) });
  const datos = await r.json().catch(() => ({ error: `Error ${r.status}` }));
  if (!r.ok) throw new Error(datos.error ?? `Error ${r.status}`);
  return datos.filas as number;
}

export default function CargarCatalogo() {
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [nombre, setNombre] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"" | "subiendo" | "leyendo" | "procesando" | "listo" | "error">("");
  const [mensaje, setMensaje] = useState("");
  const [avance, setAvance] = useState({ hechas: 0, total: 0, filas: 0, fallidas: 0 });
  const cancelar = useRef(false);

  async function cargarLista() {
    const { data } = await clienteNavegador().from("catalogos").select("*").order("creado_en");
    setCatalogos((data ?? []) as Catalogo[]);
  }
  useEffect(() => {
    cargarLista();
  }, []);

  // Si se sale de la página mientras procesa, el navegador avisa antes de cerrar.
  useEffect(() => {
    if (estado !== "procesando" && estado !== "subiendo" && estado !== "leyendo") return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [estado]);

  function fallar(texto: string) {
    setMensaje(texto);
    setEstado("error");
  }

  async function empezar(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    const supabase = clienteNavegador();
    const titulo = nombre.trim();
    cancelar.current = false;
    setMensaje("");

    // Si el catálogo ya existe y quedó a medias, se retoma desde donde se cortó.
    let catalogo = catalogos.find((c) => c.nombre.toLowerCase() === titulo.toLowerCase());
    if (catalogo?.estado === "listo") return fallar("Ese catálogo ya está cargado. Si querés cargarlo de nuevo, borralo primero de la lista.");

    setEstado("leyendo");
    let pdf: PDFDocumentProxy;
    try {
      pdf = await abrirPdf(archivo);
    } catch {
      return fallar("No se pudo abrir el archivo. Tiene que ser un PDF.");
    }

    if (!catalogo) {
      setEstado("subiendo");
      const ruta = nombreArchivo(titulo);
      const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { contentType: "application/pdf", upsert: true });
      if (errorSubida) return fallar(`No se pudo guardar el PDF: ${errorSubida.message}`);
      const { data, error } = await supabase
        .from("catalogos")
        .insert({ nombre: titulo, archivo: ruta, paginas: pdf.numPages })
        .select("*")
        .single();
      if (error) return fallar(`No se pudo crear el catálogo: ${error.message}`);
      catalogo = data as Catalogo;
    }
    const desde = catalogo.pagina_procesada + 1;
    await supabase.from("catalogo_pn").delete().eq("catalogo", catalogo.nombre).gte("pagina", desde);

    setEstado("leyendo");
    const paginas: Tanda = [];
    let caracteres = 0;
    for (let n = desde; n <= pdf.numPages; n++) {
      const texto = await textoDePagina(await pdf.getPage(n));
      caracteres += texto.trim().length;
      if (pareceListaDePartes(texto)) paginas.push({ pagina: n, texto });
    }
    if (caracteres < (pdf.numPages - desde + 1) * 50) {
      return fallar("Este PDF no tiene texto reconocido (es una imagen escaneada). Pasámelo por el chat y lo cargo yo.");
    }

    const tandas = armarTandas(paginas);
    setAvance({ hechas: 0, total: tandas.length, filas: 0, fallidas: 0 });
    setEstado("procesando");
    let filas = 0;
    let fallidas = 0;
    for (let i = 0; i < tandas.length; i += EN_PARALELO) {
      if (cancelar.current) break;
      const grupo = tandas.slice(i, i + EN_PARALELO);
      const resultados = await Promise.all(
        grupo.map(async (t) => {
          try {
            return await procesarTanda(catalogo!.id, t);
          } catch {
            // Un segundo intento, página por página, por si la tanda era muy larga.
            let n = 0;
            for (const p of t) {
              try {
                n += await procesarTanda(catalogo!.id, [p]);
              } catch {
                fallidas++;
              }
            }
            return n;
          }
        }),
      );
      filas += resultados.reduce((a, b) => a + b, 0);
      const ultima = grupo[grupo.length - 1];
      await supabase.from("catalogos").update({ pagina_procesada: ultima[ultima.length - 1].pagina }).eq("id", catalogo.id);
      setAvance({ hechas: Math.min(i + EN_PARALELO, tandas.length), total: tandas.length, filas, fallidas });
    }

    if (cancelar.current) {
      setEstado("");
      setMensaje("Pausado. Para seguir, elegí el mismo PDF con el mismo nombre y tocá Cargar.");
    } else {
      await supabase.from("catalogos").update({ estado: "listo", pagina_procesada: pdf.numPages }).eq("id", catalogo.id);
      setEstado("listo");
      setMensaje(
        `Listo: ${filas.toLocaleString("es")} PN cargados.` + (fallidas ? ` ${fallidas} páginas no se pudieron leer.` : ""),
      );
    }
    cargarLista();
  }

  async function borrar(c: Catalogo) {
    if (!confirm(`¿Borrar el catálogo "${c.nombre}" y todos sus PN?`)) return;
    const supabase = clienteNavegador();
    await supabase.from("catalogo_pn").delete().eq("catalogo", c.nombre);
    await supabase.storage.from(BUCKET).remove([c.archivo]);
    await supabase.from("catalogos").delete().eq("id", c.id);
    cargarLista();
  }

  const ocupado = estado === "subiendo" || estado === "leyendo" || estado === "procesando";
  const porcentaje = avance.total ? Math.round((avance.hechas / avance.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <form onSubmit={empezar} className="tarjeta space-y-5 p-5 sm:p-6">
        <div>
          <p className="subtitulo text-acento">Catálogos de fábrica</p>
          <h1 className="titulo mt-1">Cargar un catálogo</h1>
          <p className="mt-1 text-sm secundario">
            Elegí el PDF del manual de repuestos. La app lo guarda, lee cada página con IA y arma la lista de PN con su página. Un manual de 500 páginas tarda unos 15 minutos: dejá esta pantalla abierta hasta que termine.
          </p>
        </div>
        <div>
          <label className="etiqueta" htmlFor="nombre">Nombre del catálogo</label>
          <input id="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="CAT 3516 · Parts Manual" className="campo" disabled={ocupado} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="pdf">Archivo PDF (hasta 50 MB)</label>
          <input
            id="pdf"
            type="file"
            accept="application/pdf"
            required
            disabled={ocupado}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 50 * 1024 * 1024) {
                e.target.value = "";
                return fallar("El PDF pesa más de 50 MB. Pasámelo por el chat y lo cargo yo.");
              }
              setArchivo(f);
              if (f && !nombre) setNombre(f.name.replace(/\.pdf$/i, ""));
            }}
            className="campo file:mr-3 file:rounded file:border-0 file:bg-acento/15 file:px-3 file:py-1 file:text-acento"
          />
        </div>
        {ocupado ? (
          <button type="button" onClick={() => (cancelar.current = true)} className="boton-secundario" disabled={estado !== "procesando"}>
            Pausar
          </button>
        ) : (
          <button className="boton">Cargar catálogo</button>
        )}

        {estado === "subiendo" && <Progreso texto="Guardando el PDF..." />}
        {estado === "leyendo" && <Progreso texto="Leyendo las páginas del PDF..." />}
        {estado === "procesando" && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-borde">
              <div className="h-full bg-acento transition-all" style={{ width: `${porcentaje}%` }} />
            </div>
            <p className="font-mono text-sm secundario">
              {porcentaje}% · {avance.filas.toLocaleString("es")} PN encontrados{avance.fallidas ? ` · ${avance.fallidas} páginas con error` : ""}
            </p>
          </div>
        )}
        {mensaje && <p className={`text-sm ${estado === "error" ? "text-red-400" : "text-emerald-300"}`}>{mensaje}</p>}
      </form>

      <section className="tarjeta">
        <p className="subtitulo mb-3">Catálogos cargados</p>
        <ul className="divide-y divide-borde/60">
          {catalogos.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <span className="mr-auto">
                <span className="text-white">{c.nombre}</span>
                <span className="ml-2 font-mono text-xs secundario">
                  {c.paginas} págs.
                  {c.estado === "procesando" && <span className="text-amber-300"> · a medias, hasta la pág. {c.pagina_procesada}</span>}
                </span>
              </span>
              <button onClick={() => borrar(c)} disabled={ocupado} className="chip border-red-400/40 text-red-300">
                Borrar
              </button>
            </li>
          ))}
          {catalogos.length === 0 && <li className="py-2 text-sm secundario">Todavía no hay catálogos.</li>}
        </ul>
        <Link href="/catalogo" className="enlace mt-3 inline-block text-sm">
          ← Volver a buscar en los catálogos
        </Link>
      </section>
    </div>
  );
}

function Progreso({ texto }: { texto: string }) {
  return (
    <p className="flex items-center gap-2 text-sm secundario">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-acento border-t-transparent" />
      {texto}
    </p>
  );
}
