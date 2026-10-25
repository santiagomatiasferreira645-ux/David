import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";

type Repuesto = {
  pn: string;
  marca: string | null;
  descripcion: string | null;
  proveedores: Set<string>;
  precio: { valor: number; moneda: string | null; fecha: string } | null;
  ultimaFecha: string;
};

// Todos los PN que figuran en la base: los que tienen un precio cargado y los que se le consultaron a algún proveedor.
export default async function Repuestos({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = clienteServidor();
  const [q, c] = await Promise.all([
    supabase.from("cotizaciones").select("pn, pn_normalizado, marca, descripcion, proveedor_id, precio_unitario, moneda, fecha").not("pn", "is", null).limit(5000),
    supabase.from("consultas_pn").select("pn, pn_normalizado, marca, descripcion, proveedor_id, fecha").limit(5000),
  ]);

  const porPn = new Map<string, Repuesto>();
  const filas = [...(q.data ?? []).map((x) => ({ ...x, conPrecio: true })), ...(c.data ?? []).map((x) => ({ ...x, precio_unitario: null, moneda: null, conPrecio: false }))];
  for (const f of filas) {
    if (!f.pn_normalizado) continue;
    const r = porPn.get(f.pn_normalizado) ?? { pn: f.pn!, marca: null, descripcion: null, proveedores: new Set(), precio: null, ultimaFecha: "" };
    r.marca ??= f.marca;
    r.descripcion ??= f.descripcion;
    if (f.proveedor_id) r.proveedores.add(f.proveedor_id);
    const fecha = f.fecha ?? "";
    if (f.conPrecio && f.precio_unitario != null && (!r.precio || fecha > r.precio.fecha)) r.precio = { valor: f.precio_unitario, moneda: f.moneda, fecha };
    if (fecha > r.ultimaFecha) r.ultimaFecha = fecha;
    porPn.set(f.pn_normalizado, r);
  }

  const filtro = searchParams.q?.trim().toLowerCase();
  const repuestos = [...porPn.values()]
    .filter((r) => !filtro || [r.pn, r.marca, r.descripcion].some((t) => t?.toLowerCase().includes(filtro)))
    .sort((a, b) => a.pn.localeCompare(b.pn));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="titulo">
          Repuestos <span className="font-mono text-base text-acento">{repuestos.length}</span>
        </h1>
        <div className="flex w-full gap-2 sm:w-auto">
          <form className="min-w-0 flex-1 sm:flex-none">
            <input name="q" defaultValue={searchParams.q} placeholder="PN, marca o descripción" className="campo w-full sm:w-64" />
          </form>
          <Link href="/repuestos/nuevo" className="boton shrink-0">
            + Nuevo PN
          </Link>
        </div>
      </div>
      <p className="text-sm secundario">PN con precio cargado o consultados a algún proveedor. Tocá un PN para buscar sus proveedores.</p>
      <ul className="space-y-2 sm:hidden">
        {repuestos.map((r) => (
          <li key={r.pn + r.marca} className="tarjeta space-y-1 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <Link href={linkBuscar(r)} className="pn enlace text-lg">
                {r.pn}
              </Link>
              <span className="text-sm">{r.marca}</span>
            </div>
            {r.descripcion && <p className="text-sm text-slate-300">{r.descripcion}</p>}
            <p className="font-mono text-xs secundario">
              {r.proveedores.size} {r.proveedores.size === 1 ? "proveedor" : "proveedores"}
              {r.precio ? (
                <>
                  {" · "}
                  <span className="text-emerald-300">
                    {r.precio.valor.toLocaleString("es")} {r.precio.moneda}
                  </span>{" "}
                  {r.precio.fecha}
                </>
              ) : (
                " · sin precio"
              )}
            </p>
          </li>
        ))}
        {repuestos.length === 0 && <li className="tarjeta secundario">No hay PN registrados{filtro && " con ese filtro"}.</li>}
      </ul>
      <div className="tarjeta hidden overflow-x-auto p-0 sm:block">
        <table className="tabla">
          <thead>
            <tr>
              <th>PN</th>
              <th>Marca</th>
              <th>Descripción</th>
              <th className="text-center">Proveedores</th>
              <th>Último precio</th>
            </tr>
          </thead>
          <tbody>
            {repuestos.map((r) => (
              <tr key={r.pn + r.marca}>
                <td className="whitespace-nowrap">
                  <Link href={linkBuscar(r)} className="pn enlace">
                    {r.pn}
                  </Link>
                </td>
                <td>{r.marca}</td>
                <td className="min-w-48">{r.descripcion}</td>
                <td className="text-center font-mono">{r.proveedores.size}</td>
                <td className="whitespace-nowrap font-mono">
                  {r.precio ? (
                    <>
                      <span className="text-emerald-300">
                        {r.precio.valor.toLocaleString("es")} {r.precio.moneda}
                      </span>{" "}
                      <span className="text-xs secundario">{r.precio.fecha}</span>
                    </>
                  ) : (
                    <span className="text-xs secundario">sin precio</span>
                  )}
                </td>
              </tr>
            ))}
            {repuestos.length === 0 && (
              <tr>
                <td colSpan={5} className="secundario">
                  No hay PN registrados{filtro && " con ese filtro"}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function linkBuscar(r: Repuesto): string {
  return `/buscar?pn=${encodeURIComponent(r.pn)}&marca=${encodeURIComponent(r.marca ?? "")}`;
}
