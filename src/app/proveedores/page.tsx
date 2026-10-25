import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Proveedor } from "@/lib/tipos";

export default async function Proveedores({ searchParams }: { searchParams: { q?: string; pais?: string } }) {
  let consulta = clienteServidor().from("proveedores").select("*").order("empresa").limit(1000);
  const q = searchParams.q?.trim().replace(/[%,()*]/g, "");
  if (q) consulta = consulta.or(`empresa.ilike.%${q}%,marcas.ilike.%${q}%,productos.ilike.%${q}%`);
  if (searchParams.pais) consulta = consulta.eq("pais", searchParams.pais);
  const { data } = await consulta;
  const proveedores = (data ?? []) as Proveedor[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="titulo">
          Proveedores <span className="font-mono text-base text-acento">{proveedores.length}</span>
        </h1>
        <div className="flex gap-2">
          <Link href="/proveedores/nuevo" className="boton">
            + Nuevo proveedor
          </Link>
        </div>
        <form className="flex w-full gap-2 sm:w-auto">
          <input name="q" defaultValue={q} placeholder="Empresa, marca o producto" className="campo min-w-0 flex-1 sm:w-56 sm:flex-none" />
          <input name="pais" defaultValue={searchParams.pais} placeholder="País" className="campo w-24 sm:w-28" />
          <button className="boton-secundario">Filtrar</button>
        </form>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {proveedores.map((p) => (
          <li key={p.id} className="tarjeta transition hover:border-acento/40">
            <Link href={`/proveedores/${p.id}`} className="font-semibold text-white hover:text-acento">
              {p.empresa}
            </Link>
            <p className="mt-0.5 font-mono text-xs secundario">{[p.pais, p.tipo, p.marcas].filter(Boolean).join(" · ")}</p>
            {p.productos && <p className="mt-2 line-clamp-2 text-sm text-slate-300">{p.productos}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
