import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Cliente } from "@/lib/tipos";

export default async function Clientes({ searchParams }: { searchParams: { q?: string } }) {
  let consulta = clienteServidor().from("clientes").select("*, clientes_contactos(count), ventas(count)").order("empresa").limit(1000);
  const q = searchParams.q?.trim().replace(/[%,()*]/g, "");
  if (q) consulta = consulta.or(`empresa.ilike.%${q}%,razon_social.ilike.%${q}%,dominios.ilike.%${q}%,tipo.ilike.%${q}%`);
  const { data } = await consulta;
  const clientes = (data ?? []) as (Cliente & { clientes_contactos: { count: number }[]; ventas: { count: number }[] })[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="titulo">
          Clientes <span className="font-mono text-base text-acento">{clientes.length}</span>
        </h1>
        <Link href="/clientes/nuevo" className="boton">
          + Nuevo cliente
        </Link>
        <form className="flex w-full gap-2 sm:w-auto">
          <input name="q" defaultValue={q} placeholder="Empresa, tipo o dominio de mail" className="campo min-w-0 flex-1 sm:w-64 sm:flex-none" />
          <button className="boton-secundario">Filtrar</button>
        </form>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {clientes.map((c) => (
          <li key={c.id}>
            <Link href={`/clientes/${c.id}`} className="tarjeta block transition hover:border-acento/40">
              <span className="font-semibold text-white">{c.empresa}</span>
              <p className="mt-0.5 font-mono text-xs secundario">{[c.pais, c.tipo, c.condicion_pago].filter(Boolean).join(" · ")}</p>
              <p className="mt-2 flex flex-wrap gap-3 font-mono text-xs">
                <span>
                  <span className="text-white">{c.clientes_contactos[0]?.count ?? 0}</span> <span className="secundario">contactos</span>
                </span>
                <span>
                  <span className="text-emerald-300">{c.ventas[0]?.count ?? 0}</span> <span className="secundario">ventas</span>
                </span>
                {c.margen_pct != null && <span className="text-amarillo">+{c.margen_pct}%</span>}
              </p>
            </Link>
          </li>
        ))}
        {clientes.length === 0 && <li className="tarjeta secundario sm:col-span-2">No hay clientes{q ? " con ese filtro" : " cargados"}.</li>}
      </ul>
    </div>
  );
}
