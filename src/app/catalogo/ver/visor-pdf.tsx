"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { marcarPn } from "@/lib/pdf-texto";

// Muestra una página del PDF y recuadra el PN si se pasa. En el celular arranca ampliada y centrada en el PN, para que se lea.
// pdf.js pide solo los pedazos del archivo que necesita, así no se baja el manual entero.
export function VisorPdf({ url, paginaInicial, pn }: { url: string; paginaInicial: number; pn?: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pagina, setPagina] = useState(paginaInicial);
  const [zoom, setZoom] = useState(1);

  // En el celular la hoja del PN se ve ampliada sobre el PN; las demás (dibujos, listas vecinas) enteras.
  const zoomCelular = (n: number) => (pn && n === paginaInicial ? 2.5 : 1);
  useEffect(() => {
    if (window.innerWidth < 640) setZoom(zoomCelular(paginaInicial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pn, paginaInicial]);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");
  const [marcas, setMarcas] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url).toString();
        const doc = await pdfjs.getDocument({ url, disableAutoFetch: true, disableStream: true }).promise;
        if (!cancelado) setPdf(doc);
      } catch {
        if (!cancelado) setEstado("error");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [url]);

  useEffect(() => {
    if (!pdf || !lienzo.current || !caja.current) return;
    let tarea: { cancel: () => void } | null = null;
    setEstado("cargando");
    pdf.getPage(pagina).then((p) => {
      const ancho = caja.current!.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      const base = p.getViewport({ scale: 1 });
      const vista = p.getViewport({ scale: (ancho / base.width) * zoom * dpr });
      const c = lienzo.current!;
      c.width = vista.width;
      c.height = vista.height;
      c.style.width = `${ancho * zoom}px`;
      const render = p.render({ canvasContext: c.getContext("2d")!, viewport: vista });
      tarea = render;
      render.promise
        .then(async () => {
          setEstado("listo");
          if (!pn) return setMarcas(null);
          const recuadros = await marcarPn(p, vista.transform, c.getContext("2d")!, pn);
          setMarcas(recuadros.length);
          // Lleva el primer recuadro al centro de la caja (se nota con zoom, sobre todo en el celular).
          const r = recuadros[0];
          if (caja.current) {
            caja.current.scrollTo(
              r
                ? { left: (r.x + r.ancho / 2) / dpr - caja.current.clientWidth / 2, top: (r.y + r.alto / 2) / dpr - caja.current.clientHeight / 2 }
                : { left: 0, top: 0 },
            );
          }
        })
        .catch(() => {});
    });
    return () => tarea?.cancel();
  }, [pdf, pagina, zoom, pn]);

  const total = pdf?.numPages ?? 0;
  const ir = (n: number) => {
    const destino = Math.min(Math.max(1, n), total || n);
    setPagina(destino);
    if (window.innerWidth < 640) setZoom(zoomCelular(destino));
  };

  return (
    <div className="space-y-2">
      <div className="tarjeta flex flex-wrap items-center gap-2 p-2">
        <button onClick={() => ir(pagina - 1)} disabled={pagina <= 1} className="boton-secundario px-3" aria-label="Hoja anterior">
          ‹ <span className="hidden sm:inline">Anterior</span>
        </button>
        <span className="font-mono text-sm">
          Pág. <span className="text-white">{pagina}</span>
          {total ? <span className="secundario"> / {total}</span> : null}
        </span>
        <button onClick={() => ir(pagina + 1)} disabled={!!total && pagina >= total} className="boton-secundario px-3" aria-label="Hoja siguiente">
          <span className="hidden sm:inline">Siguiente</span> ›
        </button>
        <span className="mx-1 h-5 w-px bg-borde" />
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} className="boton-secundario px-3" aria-label="Alejar">
          −
        </button>
        <button onClick={() => setZoom((z) => Math.min(4, z + 0.5))} className="boton-secundario px-3" aria-label="Acercar">
          +
        </button>
        {pn && pagina !== paginaInicial && (
          <button onClick={() => ir(paginaInicial)} className="chip border-acento/40 bg-acento/10 py-1.5 text-acento">
            Volver a la hoja del PN
          </button>
        )}
        {pn && marcas !== null && (marcas > 0 || pagina === paginaInicial) && (
          <span className="font-mono text-xs secundario">{marcas ? `${pn} marcado en la hoja` : `${pn} no se pudo marcar (hoja escaneada)`}</span>
        )}
        <a href={`${url}#page=${pagina}`} target="_blank" rel="noreferrer" className="enlace ml-auto text-sm">
          Abrir PDF completo
        </a>
      </div>
      {estado === "error" && <p className="tarjeta text-sm text-red-400">No se pudo abrir el PDF del catálogo.</p>}
      <div ref={caja} className="relative max-h-[75vh] overflow-auto rounded-lg border border-borde bg-white">
        {estado === "cargando" && (
          <div className="absolute inset-0 flex items-center justify-center bg-fondo/60">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-acento border-t-transparent" />
          </div>
        )}
        <canvas ref={lienzo} className="block min-h-[60vh]" />
      </div>
    </div>
  );
}
