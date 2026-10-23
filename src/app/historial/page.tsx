import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Busqueda } from "@/lib/tipos";

const COLOR: Record<string, string> = {
  abierta: "bg-amber-100 text-amber-900",
  cotizada: "bg-blue-100 text-blue-900",
  comprada: "bg-green-100 text-green-900",
  perdida: "bg-slate-200 text-slate-700",
};

export default async function Historial({ searchParams }: { searchParams: { q?: string } }) {
  let consulta = clienteServidor().from("busquedas").select("*").order("creado_en", { ascending: false }).limit(200);
  const q = searchParams.q?.trim();
  if (q) consulta = consulta.or(`pn.ilike.%${q.replace(/[%,()*]/g, "")}%,cliente.ilike.%${q.replace(/[%,()*]/g, "")}%`);
  const { data } = await consulta;
  const busquedas = (data ?? []) as Busqueda[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Historial de búsquedas</h1>
        <form>
          <input name="q" defaultValue={q} placeholder="Filtrar por PN o cliente" className="campo w-64" />
        </form>
      </div>
      <div className="tarjeta overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-2">Fecha</th>
              <th className="p-2">PN</th>
              <th className="p-2">Marca</th>
              <th className="p-2">Cant.</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {busquedas.map((b) => (
              <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="p-2 whitespace-nowrap">{b.creado_en.slice(0, 10)}</td>
                <td className="p-2">
                  <Link href={`/buscar?id=${b.id}`} className="font-medium text-blue-800 hover:underline">
                    {b.pn}
                  </Link>
                </td>
                <td className="p-2">{b.marca}</td>
                <td className="p-2">{b.cantidad}</td>
                <td className="p-2">{b.cliente}</td>
                <td className="p-2">
                  <span className={`rounded-full px-2 py-0.5 ${COLOR[b.estado]}`}>{b.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {busquedas.length === 0 && <p className="p-4 text-slate-500">Todavía no hay búsquedas.</p>}
      </div>
    </div>
  );
}
