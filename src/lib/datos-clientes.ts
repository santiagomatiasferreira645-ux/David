import "server-only";
import { precioSugerido, type Sugerencia } from "./clientes";
import { normalizarPn } from "./pn";
import { clienteServidor } from "./supabase/servidor";
import type { Cliente, PrecioCliente, Venta } from "./tipos";

// Renglón de lo presupuestado o vendido a un cliente: sale de ventas o de los presupuestos históricos cargados con IA.
export type Renglon = Pick<
  Venta,
  "fecha" | "estado" | "comprobante" | "pn" | "marca" | "descripcion" | "cantidad" | "precio_unitario" | "moneda" | "costo_unitario" | "embarcacion"
> & { id: string; cliente_id: string | null; fuente: "venta" | "presupuesto" };

type FilaPresupuesto = {
  id: number;
  pn: string | null;
  marca: string | null;
  descripcion: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  moneda: string | null;
  presupuestos: { fecha: string | null; numero: string | null; cliente_id: string | null; moneda: string | null } | null;
};

const deVenta = (v: Venta): Renglon => ({ ...v, id: `v${v.id}`, fuente: "venta" });

// Los presupuestos históricos están en otra migración (0007); si todavía no se corrió, no hay renglones.
async function presupuestosHistoricos(filtro: { clienteId?: string; pn?: string }, limite: number): Promise<Renglon[]> {
  let q = clienteServidor()
    .from("presupuesto_items")
    .select("id, pn, marca, descripcion, cantidad, precio_unitario, moneda, presupuestos!inner(fecha, numero, cliente_id, moneda, tipo)")
    .eq("presupuestos.tipo", "propio")
    .limit(limite);
  if (filtro.clienteId) q = q.eq("presupuestos.cliente_id", filtro.clienteId);
  else q = q.not("presupuestos.cliente_id", "is", null);
  if (filtro.pn) q = q.eq("pn_normalizado", normalizarPn(filtro.pn));
  const { data, error } = await q;
  if (error) return [];
  return ((data ?? []) as unknown as FilaPresupuesto[]).map((f) => ({
    id: `p${f.id}`,
    cliente_id: f.presupuestos?.cliente_id ?? null,
    fuente: "presupuesto",
    fecha: f.presupuestos?.fecha ?? "",
    estado: "Presupuestado",
    comprobante: f.presupuestos?.numero ?? null,
    pn: f.pn,
    marca: f.marca,
    descripcion: f.descripcion,
    cantidad: f.cantidad,
    precio_unitario: f.precio_unitario,
    moneda: f.moneda ?? f.presupuestos?.moneda ?? null,
    costo_unitario: null,
    embarcacion: null,
  }));
}

const porFecha = (a: Renglon, b: Renglon) => b.fecha.localeCompare(a.fecha);

export async function historialCliente(clienteId: string, pn?: string): Promise<Renglon[]> {
  let q = clienteServidor().from("ventas").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }).limit(500);
  if (pn) q = q.eq("pn_normalizado", normalizarPn(pn));
  const [{ data, error }, presupuestos] = await Promise.all([q, presupuestosHistoricos({ clienteId, pn }, 500)]);
  if (error) throw error;
  return [...((data ?? []) as Venta[]).map(deVenta), ...presupuestos].sort(porFecha);
}

// Lo que se le presupuestó o vendió a cualquier cliente por este PN, con el nombre del cliente.
export async function historialPn(pn: string): Promise<(Renglon & { empresa: string })[]> {
  const supabase = clienteServidor();
  const [{ data }, presupuestos] = await Promise.all([
    supabase.from("ventas").select("*").eq("pn_normalizado", normalizarPn(pn)).order("fecha", { ascending: false }).limit(100),
    presupuestosHistoricos({ pn }, 100),
  ]);
  const filas = [...((data ?? []) as Venta[]).map(deVenta), ...presupuestos].sort(porFecha);
  const ids = Array.from(new Set(filas.map((f) => f.cliente_id).filter(Boolean))) as string[];
  const { data: clientes } = ids.length ? await supabase.from("clientes").select("id, empresa").in("id", ids) : { data: [] };
  const nombre = new Map((clientes ?? []).map((c) => [c.id as string, c.empresa as string]));
  return filas.map((f) => ({ ...f, empresa: nombre.get(f.cliente_id ?? "") ?? "—" }));
}

// Precio a sugerirle a un cliente por un PN, con el costo más reciente que nos cotizaron.
export async function sugerenciaPara(cliente: Cliente, pn: string, historial?: Renglon[]): Promise<Sugerencia | null> {
  const supabase = clienteServidor();
  const pnN = normalizarPn(pn);
  const [acordado, costo, ventas] = await Promise.all([
    supabase.from("precios_cliente").select("*").eq("cliente_id", cliente.id).eq("pn_normalizado", pnN).maybeSingle(),
    supabase
      .from("cotizaciones")
      .select("precio_unitario, moneda, fecha, proveedores(empresa)")
      .eq("pn_normalizado", pnN)
      .eq("tipo_precio", "Cotización del proveedor")
      .not("precio_unitario", "is", null)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle(),
    historial ? Promise.resolve(historial) : historialCliente(cliente.id, pn),
  ]);
  const c = costo.data as { precio_unitario: number; moneda: string | null; fecha: string; proveedores: { empresa: string } | null } | null;
  return precioSugerido({
    acordado: acordado.data as PrecioCliente | null,
    ventas: ventas.filter((v) => v.estado !== "Perdido"),
    costo: c ? { precio: c.precio_unitario, moneda: c.moneda, proveedor: c.proveedores?.empresa, fecha: c.fecha } : null,
    margenPct: cliente.margen_pct,
    monedaCliente: cliente.moneda,
  });
}

// Cliente de la base que coincide con el texto libre de una búsqueda ("HBSA", "Hidrovias Brasil").
export async function clientePorNombre(texto: string | null | undefined): Promise<Cliente | null> {
  const t = texto?.replace(/[%_,()*]/g, " ").trim();
  if (!t || t.length < 3) return null;
  const { data } = await clienteServidor().from("clientes").select("*").ilike("empresa", `%${t}%`).limit(2);
  return data?.length === 1 ? (data[0] as Cliente) : null;
}
