import Link from "next/link";
import { urlCatalogo } from "@/lib/catalogo";
import { VisorPdf } from "./visor-pdf";

export default async function VerPagina({ searchParams }: { searchParams: { archivo?: string; pagina?: string; pn?: string } }) {
  const archivo = searchParams.archivo ?? "";
  const pagina = Math.max(1, Number(searchParams.pagina) || 1);
  const url = archivo ? await urlCatalogo(archivo) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/catalogo${searchParams.pn ? `?q=${encodeURIComponent(searchParams.pn)}` : ""}`} className="enlace text-sm">
          ← Volver al catálogo
        </Link>
        {searchParams.pn && <span className="pn text-sm secundario">Buscando {searchParams.pn}</span>}
      </div>
      {url ? (
        <VisorPdf url={url} paginaInicial={pagina} pn={searchParams.pn} />
      ) : (
        <p className="tarjeta text-sm secundario">
          Todavía no está subido el PDF de este catálogo. Se sube desde{" "}
          <Link href="/catalogo/cargar" className="enlace">
            Catálogos &gt; Cargar catálogo
          </Link>
          , con el botón &quot;Subir PDF&quot;.
        </p>
      )}
    </div>
  );
}
