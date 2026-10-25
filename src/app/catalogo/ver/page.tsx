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
        <VisorPdf url={url} paginaInicial={pagina} />
      ) : (
        <p className="tarjeta text-sm secundario">
          Todavía no está subido el PDF del catálogo. Hay que subirlo en Supabase, en Storage &gt; catalogos, con el nombre {archivo || "del archivo"}.
        </p>
      )}
    </div>
  );
}
