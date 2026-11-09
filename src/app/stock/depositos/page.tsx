import Link from "next/link";
import { clienteServidor } from "@/lib/supabase/servidor";
import { listarDepositos } from "@/lib/stock-datos";
import { formatoCantidad } from "@/lib/stock";
import { guardarDeposito } from "../acciones";
import { AvisoError, Encabezado } from "../componentes";

// Depósitos donde guardamos stock: galpones, talleres, oficinas o un barco.
export default async function Depositos({ searchParams }: { searchParams: { error?: string } }) {
  const [depositos, { data: existencias }] = await Promise.all([
    listarDepositos(),
    clienteServidor().from("stock_existencias").select("deposito_id, cantidad").gt("cantidad", 0).limit(20000),
  ]);
  const resumen = new Map<number, { articulos: number; unidades: number }>();
  for (const e of existencias ?? []) {
    const r = resumen.get(e.deposito_id) ?? { articulos: 0, unidades: 0 };
    r.articulos += 1;
    r.unidades += Number(e.cantidad);
    resumen.set(e.deposito_id, r);
  }

  return (
    <div className="space-y-4">
      <div className="tarjeta p-5">
        <Encabezado titulo="Depósitos">
          <p className="mt-1 text-sm secundario">Cada lugar donde hay stock. Un depósito que ya no se usa se marca como inactivo y deja de aparecer en las altas.</p>
        </Encabezado>
      </div>
      <AvisoError error={searchParams.error} />

      <ul className="grid gap-3 sm:grid-cols-2">
        {depositos.map((d) => {
          const r = resumen.get(d.id);
          return (
            <li key={d.id} className={`tarjeta space-y-3 ${d.activo ? "" : "opacity-60"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/stock?deposito=${d.id}`} className="font-semibold text-white hover:text-acento">
                  {d.nombre}
                </Link>
                <span className="font-mono text-xs secundario">
                  {r ? `${r.articulos} artículos · ${formatoCantidad(r.unidades)} u.` : "vacío"}
                </span>
              </div>
              {(d.ubicacion || !d.activo) && <p className="text-xs secundario">{[d.ubicacion, !d.activo && "inactivo"].filter(Boolean).join(" · ")}</p>}
              <details>
                <summary className="cursor-pointer text-sm text-acento">Editar</summary>
                <form action={guardarDeposito} className="mt-3 space-y-3">
                  <input type="hidden" name="id" value={d.id} />
                  <input name="nombre" defaultValue={d.nombre} required className="campo" aria-label="Nombre" />
                  <input name="ubicacion" defaultValue={d.ubicacion ?? ""} placeholder="Ciudad, país o dirección" className="campo" aria-label="Ubicación" />
                  <input name="notas" defaultValue={d.notas ?? ""} placeholder="Notas" className="campo" aria-label="Notas" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="activo" defaultChecked={d.activo} /> Activo
                  </label>
                  <button className="boton-secundario">Guardar</button>
                </form>
              </details>
            </li>
          );
        })}
      </ul>

      <form action={guardarDeposito} className="tarjeta space-y-3 p-5">
        <p className="subtitulo text-amarillo">Nuevo depósito</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="nombre" required placeholder="Nombre (ej. Galpón Zárate)" className="campo" aria-label="Nombre" />
          <input name="ubicacion" placeholder="Ciudad, país o dirección" className="campo" aria-label="Ubicación" />
          <input name="notas" placeholder="Notas" className="campo" aria-label="Notas" />
        </div>
        <button className="boton">+ Agregar depósito</button>
      </form>
    </div>
  );
}
