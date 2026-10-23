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
        <h1 className="text-xl font-bold">Proveedores ({proveedores.length})</h1>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Empresa, marca o producto" className="campo w-56" />
          <input name="pais" defaultValue={searchParams.pais} placeholder="País" className="campo w-28" />
          <button className="boton-secundario">Filtrar</button>
        </form>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {proveedores.map((p) => (
          <li key={p.id} className="tarjeta">
            <Link href={`/proveedores/${p.id}`} className="font-semibold text-blue-800 hover:underline">
              {p.empresa}
            </Link>
            <p className="text-sm text-slate-600">{[p.pais, p.tipo, p.marcas].filter(Boolean).join(" · ")}</p>
            {p.productos && <p className="mt-1 line-clamp-2 text-sm">{p.productos}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
