import "server-only";
import { normalizarPn } from "./pn";
import { limpiarFiltro, type ItemPresupuesto, type Presupuesto } from "./presupuestos";
import { clienteServidor } from "./supabase/servidor";

export type ItemConPresupuesto = ItemPresupuesto & {
  presupuestos: Pick<Presupuesto, "id" | "tipo" | "fecha" | "numero" | "cliente" | "proveedor_nombre" | "empresa"> | null;
};

const CAMPOS = "*, presupuestos!inner(id, tipo, fecha, numero, cliente, proveedor_nombre, empresa)";

const porFecha = (a: ItemConPresupuesto, b: ItemConPresupuesto) => (b.presupuestos?.fecha ?? "").localeCompare(a.presupuestos?.fecha ?? "");

// Renglones de presupuestos que coinciden con el texto: cada palabra tiene que estar en el PN, la descripción, la marca,
// el motor, el cliente o el proveedor. Más recientes primero.
export async function buscarItems(args: { q: string; clase?: string; tipo?: string }): Promise<ItemConPresupuesto[]> {
  const supabase = clienteServidor();
  const palabras = limpiarFiltro(args.q).split(/\s+/).filter(Boolean).slice(0, 5);
  if (!palabras.length) return [];

  let consulta = supabase.from("presupuesto_items").select(CAMPOS).limit(300);
  if (args.clase === "repuesto" || args.clase === "servicio") consulta = consulta.eq("clase", args.clase);
  if (args.tipo === "propio" || args.tipo === "proveedor") consulta = consulta.eq("presupuestos.tipo", args.tipo);
  for (const p of palabras) {
    const pn = normalizarPn(p);
    const opciones = [`descripcion.ilike.%${p}%`, `marca.ilike.%${p}%`, `modelo_motor.ilike.%${p}%`];
    if (pn.length >= 2) opciones.push(`pn_normalizado.ilike.%${pn}%`);
    consulta = consulta.or(opciones.join(","));
  }
  const { data, error } = await consulta;
  if (error) throw error;
  const items = (data ?? []) as ItemConPresupuesto[];

  // Si no hubo renglones, la búsqueda puede ser por cliente o proveedor.
  if (!items.length) {
    let porNombre = supabase.from("presupuesto_items").select(CAMPOS).limit(300);
    if (args.clase === "repuesto" || args.clase === "servicio") porNombre = porNombre.eq("clase", args.clase);
    if (args.tipo === "propio" || args.tipo === "proveedor") porNombre = porNombre.eq("presupuestos.tipo", args.tipo);
    const t = palabras.join(" ");
    porNombre = porNombre.or(`cliente.ilike.%${t}%,proveedor_nombre.ilike.%${t}%,numero.ilike.%${t}%`, { referencedTable: "presupuestos" });
    const r = await porNombre;
    if (r.error) throw r.error;
    return ((r.data ?? []) as ItemConPresupuesto[]).sort(porFecha);
  }
  return items.sort(porFecha);
}

// Para la pantalla de búsqueda: lo que ya presupuestamos o nos presupuestaron de este PN.
export async function itemsDelPn(pn: string): Promise<ItemConPresupuesto[]> {
  const pnN = normalizarPn(pn);
  if (pnN.length < 3) return [];
  const { data, error } = await clienteServidor().from("presupuesto_items").select(CAMPOS).ilike("pn_normalizado", `%${pnN}%`).limit(50);
  // Si la tabla todavía no existe (falta correr la migración) la búsqueda sigue funcionando sin esta parte.
  if (error) return [];
  return ((data ?? []) as ItemConPresupuesto[]).sort(porFecha);
}
