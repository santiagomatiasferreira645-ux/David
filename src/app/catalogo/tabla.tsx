import Link from "next/link";
import { linkPagina, type FilaCatalogo } from "@/lib/catalogo";

// Filas del catálogo: PN, descripción tal como figura en el manual, lista de partes y link a la página.
export function TablaCatalogo({ filas }: { filas: FilaCatalogo[] }) {
  return (
    <ul className="divide-y divide-borde/60">
      {filas.map((f) => (
        <li key={f.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-2.5">
          <span className="pn w-24 shrink-0 font-semibold text-white">{f.pn}</span>
          <div className="min-w-0 flex-1 basis-56">
            <p className="text-sm text-slate-200">{f.descripcion || <span className="secundario">Sin descripción en el catálogo</span>}</p>
            <p className="mt-0.5 font-mono text-xs secundario">
              {[f.lista && `P.L. ${f.lista}`, f.titulo].filter(Boolean).join(" · ")}
            </p>
            {f.nota && <p className="mt-0.5 text-xs text-amber-300/90">{f.nota}</p>}
          </div>
          <Link href={linkPagina(f)} className="chip border-acento/40 bg-acento/10 py-1.5 text-acento">
            Ver pág. {f.pagina}
          </Link>
        </li>
      ))}
    </ul>
  );
}
