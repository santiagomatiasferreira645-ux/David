import { clienteServidor } from "@/lib/supabase/servidor";
import { listarDepositos } from "@/lib/stock-datos";
import { Encabezado } from "../componentes";
import { EnviarListado } from "./enviar";

// Opciones del listado en PDF para clientes. El PDF nunca muestra costos ni a quién se le compró.
export default async function Listado({ searchParams }: { searchParams: { deposito?: string } }) {
  const [depositos, { data: marcas }] = await Promise.all([
    listarDepositos(),
    clienteServidor().from("stock_articulos").select("marca").not("marca", "is", null).limit(5000),
  ]);
  const listaMarcas = Array.from(new Set((marcas ?? []).map((m) => m.marca as string))).sort((a, b) => a.localeCompare(b));

  return (
    <form action="/api/stock/pdf" target="_blank" className="tarjeta space-y-5 p-5 sm:p-6">
      <Encabezado titulo="Listado de stock en PDF">
        <p className="mt-1 text-sm secundario">
          Para mandar a un cliente: PN, marca, descripción, condición y cantidad de lo que hay en el depósito. No incluye costos ni proveedores.
        </p>
      </Encabezado>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="deposito">Depósito</label>
          <select id="deposito" name="deposito" defaultValue={searchParams.deposito ?? ""} className="campo">
            <option value="">Todos (uno por sección)</option>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="marca">Solo una marca (opcional)</label>
          <select id="marca" name="marca" defaultValue="" className="campo">
            <option value="">Todas las marcas</option>
            {listaMarcas.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="empresa">Sale con el logo de</label>
          <select id="empresa" name="empresa" defaultValue="daysa" className="campo">
            <option value="daysa">DAYSA</option>
            <option value="tecnica-naval">Técnica Naval y Servicios</option>
            <option value="spes">SPES Supplier</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="precios" value="1" className="h-4 w-4" />
          Incluir el precio de referencia
        </label>
      </div>
      <button className="boton">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
        </svg>
        Ver PDF
      </button>
      <p className="text-xs secundario">Se abre en otra pestaña para revisarlo o descargarlo.</p>
      <EnviarListado />
    </form>
  );
}
