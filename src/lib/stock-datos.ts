import "server-only";
import { normalizarPn } from "./pn";
import { COLUMNAS_ARTICULO, type ArticuloStock, type Deposito } from "./stock";
import { clienteServidor } from "./supabase/servidor";

export async function listarDepositos(soloActivos = false): Promise<Deposito[]> {
  let consulta = clienteServidor().from("depositos").select("id, nombre, ubicacion, notas, activo").order("nombre");
  if (soloActivos) consulta = consulta.eq("activo", true);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as Deposito[];
}

const limpiar = (s: string) => s.replace(/[%,()*]/g, " ").trim();

// Si el texto parece un PN busca por número (también parcial); si no, por PN, marca, descripción o motor.
export async function buscarStock(texto: string, depositoId?: number): Promise<ArticuloStock[]> {
  const q = limpiar(texto);
  const columnas = depositoId ? COLUMNAS_ARTICULO.replace("stock_existencias (", "stock_existencias!inner (") : COLUMNAS_ARTICULO;
  let consulta = clienteServidor().from("stock_articulos").select(columnas);
  if (depositoId) consulta = consulta.eq("stock_existencias.deposito_id", depositoId).gt("stock_existencias.cantidad", 0);
  const pnN = normalizarPn(q);
  if (q && /\d/.test(q) && pnN.length >= 3 && !/\s/.test(q)) {
    consulta = consulta.ilike("pn_normalizado", `%${pnN}%`);
  } else {
    for (const palabra of q.split(/\s+/).filter((p) => p.length > 1)) {
      consulta = consulta.or(`pn.ilike.%${palabra}%,marca.ilike.%${palabra}%,descripcion.ilike.%${palabra}%,modelo_motor.ilike.%${palabra}%`);
    }
  }
  const { data, error } = await consulta.order("pn").limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as ArticuloStock[];
}

export async function obtenerArticulo(id: number): Promise<ArticuloStock | null> {
  const { data } = await clienteServidor().from("stock_articulos").select(COLUMNAS_ARTICULO).eq("id", id).maybeSingle();
  return (data as unknown as ArticuloStock) ?? null;
}

// Coincidencia exacta del PN (normalizado), para mostrar en la búsqueda si lo tenemos.
export async function stockDelPn(pn: string): Promise<ArticuloStock[]> {
  const pnN = normalizarPn(pn);
  if (!pnN) return [];
  const { data } = await clienteServidor().from("stock_articulos").select(COLUMNAS_ARTICULO).eq("pn_normalizado", pnN).limit(20);
  return (data ?? []) as unknown as ArticuloStock[];
}

export type Movimiento = {
  id: number;
  deposito_id: number;
  tipo: string;
  cantidad: number;
  referencia: string | null;
  notas: string | null;
  fecha: string;
};

export async function movimientosDe(articuloId: number): Promise<Movimiento[]> {
  const { data } = await clienteServidor()
    .from("stock_movimientos")
    .select("id, deposito_id, tipo, cantidad, referencia, notas, fecha")
    .eq("articulo_id", articuloId)
    .order("fecha", { ascending: false })
    .order("id", { ascending: false })
    .limit(200);
  return (data ?? []) as Movimiento[];
}

export type ProveedorCorto = { id: string; empresa: string; pais: string | null };

export async function proveedoresParaElegir(): Promise<ProveedorCorto[]> {
  const { data } = await clienteServidor().from("proveedores").select("id, empresa, pais").order("empresa").limit(2000);
  return (data ?? []) as ProveedorCorto[];
}

// Cuáles de estos PN figuran en algún catálogo de fábrica (para marcarlos en la lista).
export async function pnEnCatalogos(pns: string[]): Promise<Set<string>> {
  const unicos = Array.from(new Set(pns.filter(Boolean)));
  const encontrados = new Set<string>();
  for (let i = 0; i < unicos.length; i += 150) {
    const { data } = await clienteServidor().from("catalogo_pn").select("pn_normalizado").in("pn_normalizado", unicos.slice(i, i + 150)).limit(5000);
    (data ?? []).forEach((f) => encontrados.add(f.pn_normalizado));
  }
  return encontrados;
}
