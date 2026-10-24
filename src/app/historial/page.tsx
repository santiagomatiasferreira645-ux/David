import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Busqueda } from "@/lib/tipos";
import { Estado } from "../insignias";

export default async function Historial({ searchParams }: { searchParams: { q?: string } }) {
  let consulta = clienteServidor().from("busquedas").select("*").order("creado_en", { ascending: false }).limit(200);
  const q = searchParams.q?.trim();
  if (q) consulta = consulta.or(`pn.ilike.%${q.replace(/[%,()*]/g, "")}%,cliente.ilike.%${q.replace(/[%,()*]/g, "")}%`);
  const { data } = await consulta;
  const busquedas = (data ?? []) as Busqueda[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="titulo">Historial de búsquedas</h1>
        <form>
          <input name="q" defaultValue={q} placeholder="Filtrar por PN o cliente" className="campo w-64" />
        </form>
      </div>
      <div className="tarjeta overflow-x-auto p-0">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>PN</th>
              <th>Marca</th>
              <th>Cant.</th>
              <th>Cliente</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {busquedas.map((b) => (
              <tr key={b.id}>
                <td className="whitespace-nowrap font-mono text-xs secundario">{b.creado_en.slice(0, 10)}</td>
                <td>
                  <Link href={`/buscar?id=${b.id}`} className="pn enlace">
                    {b.pn}
                  </Link>
                </td>
                <td>{b.marca}</td>
                <td className="font-mono">{b.cantidad}</td>
                <td>{b.cliente}</td>
                <td>
                  <Estado estado={b.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {busquedas.length === 0 && <p className="p-4 secundario">Todavía no hay búsquedas.</p>}
      </div>
    </div>
  );
}
