import { notFound, redirect } from "next/navigation";
import { ESTADOS_VENTA, MONEDAS, formatoPrecio } from "@/lib/clientes";
import { sugerenciaPara } from "@/lib/datos-clientes";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Cliente } from "@/lib/tipos";
import { Campo, Lista, lector } from "../../campos";

type Params = { pn?: string; marca?: string; precio?: string; moneda?: string; busqueda?: string };

export default async function RegistrarVenta({ params, searchParams }: { params: { id: string }; searchParams: Params }) {
  const supabase = clienteServidor();
  const [c, p] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("proveedores").select("id, empresa").order("empresa").limit(2000),
  ]);
  if (!c.data) notFound();
  const cliente = c.data as Cliente;
  const pn = searchParams.pn?.trim();
  const sugerencia = pn && !searchParams.precio ? await sugerenciaPara(cliente, pn) : null;
  const precio = searchParams.precio ?? sugerencia?.precio;
  const moneda = searchParams.moneda ?? sugerencia?.moneda ?? cliente.moneda;
  const id = cliente.id;

  async function guardar(form: FormData) {
    "use server";
    const { txt, num } = lector(form);
    const busqueda = num("busqueda");
    const estado = txt("estado") ?? "Vendido";
    const supabase = clienteServidor();
    const { error } = await supabase.from("ventas").insert({
      cliente_id: id,
      fecha: txt("fecha") ?? undefined,
      estado,
      comprobante: txt("comprobante"),
      pn: txt("pn"),
      marca: txt("marca"),
      descripcion: txt("descripcion"),
      modelo_motor: txt("modelo_motor"),
      embarcacion: txt("embarcacion"),
      cantidad: num("cantidad"),
      precio_unitario: num("precio"),
      moneda: txt("moneda"),
      costo_unitario: num("costo"),
      proveedor_id: txt("proveedor"),
      busqueda_id: busqueda,
      plazo_entrega: txt("plazo_entrega"),
      notas: txt("notas"),
      origen: "App",
    });
    if (error) throw error;
    if (busqueda) {
      // La búsqueda queda atada al cliente y, si se vendió, marcada como comprada.
      const cambios: Record<string, string> = { cliente_id: id };
      if (estado === "Vendido") cambios.estado = "comprada";
      await supabase.from("busquedas").update(cambios).eq("id", busqueda);
    }
    redirect(`/clientes/${id}`);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <form action={guardar} className="tarjeta space-y-5 p-5 sm:p-6">
      <div>
        <p className="subtitulo text-amarillo">{cliente.empresa}</p>
        <h1 className="titulo mt-1">Registrar venta o presupuesto</h1>
        {sugerencia && (
          <p className="mt-1 text-sm secundario">
            Precio sugerido {formatoPrecio(sugerencia.precio, sugerencia.moneda)} · {sugerencia.detalle}
          </p>
        )}
      </div>
      <input type="hidden" name="busqueda" defaultValue={searchParams.busqueda} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Lista nombre="estado" texto="Estado" opciones={ESTADOS_VENTA} />
        <Campo nombre="comprobante" texto="N° de presupuesto o factura" />
        <Campo nombre="pn" texto="PN" valor={pn} requerido />
        <Campo nombre="marca" texto="Marca" valor={searchParams.marca} />
        <Campo nombre="descripcion" texto="Descripción" clase="sm:col-span-2" />
        <Campo nombre="cantidad" texto="Cantidad" tipo="number" valor="1" />
        <Campo nombre="precio" texto="Precio unitario" tipo="number" valor={precio} requerido />
        <Lista nombre="moneda" texto="Moneda" opciones={MONEDAS} valor={moneda} />
        <Campo nombre="costo" texto="Costo unitario (opcional)" tipo="number" />
        <div>
          <label className="etiqueta" htmlFor="proveedor">Proveedor (opcional)</label>
          <select id="proveedor" name="proveedor" defaultValue="" className="campo">
            <option value="">—</option>
            {(p.data ?? []).map((x) => (
              <option key={x.id} value={x.id}>{x.empresa}</option>
            ))}
          </select>
        </div>
        <Campo nombre="embarcacion" texto="Embarcación o equipo" />
        <Campo nombre="modelo_motor" texto="Modelo de motor o reductor" />
        <Campo nombre="plazo_entrega" texto="Plazo de entrega" ejemplo="15 días" />
        <Campo nombre="fecha" texto="Fecha" tipo="date" valor={hoy} />
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="notas">Notas</label>
          <textarea id="notas" name="notas" rows={3} className="campo" />
        </div>
      </div>
      <button className="boton">Guardar</button>
    </form>
  );
}
