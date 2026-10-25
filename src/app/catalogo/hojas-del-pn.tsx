"use client";

import Link from "next/link";
import { useState } from "react";
import { VisorPdf } from "./ver/visor-pdf";

export type Hoja = { id: number; catalogo: string; pagina: number; url: string | null; link: string };

// La hoja del PDF donde figura el PN, con el PN recuadrado. Si aparece en varias hojas, se elige cuál ver.
export function HojasDelPn({ pn, hojas }: { pn: string; hojas: Hoja[] }) {
  const [elegida, setElegida] = useState(0);
  const hoja = hojas[elegida];
  if (!hoja) return null;

  return (
    <div className="space-y-2">
      {hojas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {hojas.map((h, i) => (
            <button
              key={h.id}
              onClick={() => setElegida(i)}
              className={`chip py-1.5 ${i === elegida ? "border-acento bg-acento/15 text-acento" : "border-borde text-apagado"}`}
            >
              {h.catalogo} · pág. {h.pagina}
            </button>
          ))}
        </div>
      )}
      {hoja.url ? (
        <VisorPdf key={`${hoja.url}-${hoja.pagina}`} url={hoja.url} paginaInicial={hoja.pagina} pn={pn} />
      ) : (
        <p className="text-sm secundario">
          Falta subir el PDF de {hoja.catalogo}. Se sube desde{" "}
          <Link href="/catalogo/cargar" className="enlace">
            Catálogos &gt; Cargar catálogo
          </Link>
          , con el botón &quot;Subir PDF&quot;.
        </p>
      )}
      <Link href={hoja.link} className="enlace inline-block text-sm">
        Abrir en pantalla completa
      </Link>
    </div>
  );
}
