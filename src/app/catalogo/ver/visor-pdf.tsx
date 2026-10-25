"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

// Muestra una página del PDF. pdf.js pide solo los pedazos del archivo que necesita, así no se baja el manual entero.
export function VisorPdf({ url, paginaInicial }: { url: string; paginaInicial: number }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pagina, setPagina] = useState(paginaInicial);
  const [zoom, setZoom] = useState(1);
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando");

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
      const base = p.getViewport({ scale: 1 });
      const vista = p.getViewport({ scale: (ancho / base.width) * zoom * (window.devicePixelRatio || 1) });
      const c = lienzo.current!;
      c.width = vista.width;
      c.height = vista.height;
      c.style.width = `${ancho * zoom}px`;
      const render = p.render({ canvasContext: c.getContext("2d")!, viewport: vista });
      tarea = render;
      render.promise.then(() => setEstado("listo")).catch(() => {});
    });
    return () => tarea?.cancel();
  }, [pdf, pagina, zoom]);

  const total = pdf?.numPages ?? 0;
  const ir = (n: number) => setPagina(Math.min(Math.max(1, n), total || n));

  return (
    <div className="space-y-2">
      <div className="tarjeta flex flex-wrap items-center gap-2 p-2">
        <button onClick={() => ir(pagina - 1)} disabled={pagina <= 1} className="boton-secundario px-3">
          ‹
        </button>
        <span className="font-mono text-sm">
          Pág. <span className="text-white">{pagina}</span>
          {total ? <span className="secundario"> / {total}</span> : null}
        </span>
        <button onClick={() => ir(pagina + 1)} disabled={!!total && pagina >= total} className="boton-secundario px-3">
          ›
        </button>
        <span className="mx-1 h-5 w-px bg-borde" />
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} className="boton-secundario px-3" aria-label="Alejar">
          −
        </button>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.5))} className="boton-secundario px-3" aria-label="Acercar">
          +
        </button>
        <a href={`${url}#page=${pagina}`} target="_blank" rel="noreferrer" className="enlace ml-auto text-sm">
          Abrir PDF completo
        </a>
      </div>
      {estado === "error" && <p className="tarjeta text-sm text-red-400">No se pudo abrir el PDF del catálogo.</p>}
      <div ref={caja} className="relative overflow-auto rounded-lg border border-borde bg-white">
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
