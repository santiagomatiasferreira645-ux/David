import Link from "next/link";
import { formatoPrecio } from "@/lib/clientes";
import { clientePorNombre, historialPn, sugerenciaPara } from "@/lib/datos-clientes";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Busqueda, Cliente } from "@/lib/tipos";

// En el resultado de una búsqueda: a qué precio se le vendió o presupuestó este PN a cada cliente,
// y si la búsqueda es para un cliente de la base, el precio sugerido para él.
export async function VentasClientes({ busqueda }: { busqueda: Busqueda }) {
  const cliente = busqueda.cliente_id
    ? (((await clienteServidor().from("clientes").select("*").eq("id", busqueda.cliente_id).maybeSingle()).data as Cliente | null) ?? null)
    : await clientePorNombre(busqueda.cliente);
  const [historial, sugerencia] = await Promise.all([historialPn(busqueda.pn), cliente ? sugerenciaPara(cliente, busqueda.pn) : null]);
  if (!cliente && historial.length === 0) return null;

  const venta = cliente
    ? `/clientes/${cliente.id}/venta?pn=${encodeURIComponent(busqueda.pn)}&marca=${encodeURIComponent(busqueda.marca ?? "")}&busqueda=${busqueda.id}` +
      (sugerencia ? `&precio=${sugerencia.precio}&moneda=${sugerencia.moneda}` : "")
    : null;

  return (
    <section className="tarjeta space-y-3">
      <p className="subtitulo text-amarillo">Clientes</p>
      {cliente && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href={`/clientes/${cliente.id}`} className="font-semibold text-white hover:text-acento">
              {cliente.empresa}
            </Link>
            {sugerencia ? (
              <>
                <p className="font-mono text-2xl font-semibold text-emerald-300">{formatoPrecio(sugerencia.precio, sugerencia.moneda)}</p>
                <p className="text-sm secundario">{sugerencia.detalle}</p>
              </>
            ) : (
              <p className="text-sm secundario">Sin precio anterior ni margen para sugerir.</p>
            )}
          </div>
          <Link href={venta!} className="boton-secundario">
            + Registrar venta
          </Link>
        </div>
      )}
      {historial.length > 0 && (
        <div className="overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Cant.</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              {historial.slice(0, 8).map((h) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap font-mono text-xs secundario">{h.fecha}</td>
                  <td>
                    {h.cliente_id ? (
                      <Link href={`/clientes/${h.cliente_id}?pn=${encodeURIComponent(busqueda.pn)}`} className="hover:text-acento">
                        {h.empresa}
                      </Link>
                    ) : (
                      h.empresa
                    )}
                  </td>
                  <td className="text-xs secundario">{h.estado}</td>
                  <td className="font-mono">{h.cantidad ?? ""}</td>
                  <td className="whitespace-nowrap font-mono text-emerald-300">{formatoPrecio(h.precio_unitario, h.moneda)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
