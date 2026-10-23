import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

const MONEDAS = ["USD", "EUR", "ARS", "BRL", "PYG", "CNY", "INR"];
const CONDICIONES = ["Nuevo original", "Nuevo OEM", "Alternativo", "Usado", "Reacondicionado"];
const TIPOS = ["Cotización del proveedor", "Referencia de mercado", "Flete / servicio", "Precio propio / oferta nuestra"];
const INCOTERMS = ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"];

type Params = { pn?: string; marca?: string; proveedor?: string; busqueda?: string };

export default async function NuevaCotizacion({ searchParams }: { searchParams: Params }) {
  const { data: proveedores } = await clienteServidor().from("proveedores").select("id, empresa, pais").order("empresa").limit(2000);

  async function guardar(form: FormData) {
    "use server";
    const txt = (k: string) => String(form.get(k) ?? "").trim() || null;
    const num = (k: string) => (txt(k) ? Number(txt(k)) : null);
    const { error } = await clienteServidor().from("cotizaciones").insert({
      busqueda_id: num("busqueda"),
      proveedor_id: txt("proveedor"),
      fecha: txt("fecha") ?? undefined,
      pn: txt("pn"),
      marca: txt("marca"),
      descripcion: txt("descripcion"),
      modelo_motor: txt("modelo_motor"),
      cantidad: num("cantidad"),
      precio_unitario: num("precio"),
      moneda: txt("moneda"),
      incoterm: txt("incoterm"),
      plazo_dias: num("plazo"),
      condicion: txt("condicion"),
      tipo_precio: txt("tipo") ?? undefined,
      notas: txt("notas"),
      origen: "App",
    });
    if (error) throw error;
    const busqueda = txt("busqueda");
    if (busqueda) {
      await clienteServidor().from("busquedas").update({ estado: "cotizada" }).eq("id", Number(busqueda)).eq("estado", "abierta");
      redirect(`/buscar?id=${busqueda}`);
    }
    redirect(`/proveedores/${txt("proveedor")}`);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <form action={guardar} className="tarjeta space-y-4">
      <h1 className="text-xl font-bold">Cargar precio recibido</h1>
      <input type="hidden" name="busqueda" defaultValue={searchParams.busqueda} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="proveedor">Proveedor</label>
          <select id="proveedor" name="proveedor" required defaultValue={searchParams.proveedor ?? ""} className="campo">
            <option value="" disabled>Elegir proveedor</option>
            {(proveedores ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.empresa} {p.pais && `(${p.pais})`}
              </option>
            ))}
          </select>
        </div>
        <Campo nombre="pn" texto="PN" valor={searchParams.pn} requerido />
        <Campo nombre="marca" texto="Marca" valor={searchParams.marca} />
        <Campo nombre="descripcion" texto="Descripción" />
        <Campo nombre="modelo_motor" texto="Modelo de motor o reductor" />
        <Campo nombre="precio" texto="Precio unitario" tipo="number" requerido />
        <Lista nombre="moneda" texto="Moneda" opciones={MONEDAS} />
        <Campo nombre="cantidad" texto="Cantidad" tipo="number" />
        <Campo nombre="plazo" texto="Plazo de entrega (días)" tipo="number" />
        <Lista nombre="condicion" texto="Condición" opciones={CONDICIONES} />
        <Lista nombre="incoterm" texto="Incoterm" opciones={INCOTERMS} vacio />
        <Lista nombre="tipo" texto="Tipo de precio" opciones={TIPOS} />
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

function Campo(p: { nombre: string; texto: string; tipo?: string; valor?: string; requerido?: boolean }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <input id={p.nombre} name={p.nombre} type={p.tipo ?? "text"} step={p.tipo === "number" ? "any" : undefined} defaultValue={p.valor} required={p.requerido} className="campo" />
    </div>
  );
}

function Lista(p: { nombre: string; texto: string; opciones: string[]; vacio?: boolean }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <select id={p.nombre} name={p.nombre} className="campo" defaultValue={p.vacio ? "" : p.opciones[0]}>
        {p.vacio && <option value="">—</option>}
        {p.opciones.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
