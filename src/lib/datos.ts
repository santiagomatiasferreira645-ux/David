import "server-only";
import { armarResultados, type Resultado } from "./busqueda";
import { normalizarPn } from "./pn";
import { clienteServidor } from "./supabase/servidor";
import type { Busqueda, ConsultaPn, Contacto, Cotizacion, Proveedor } from "./tipos";

// Caracteres con significado en los filtros de PostgREST; el PN ya viene normalizado, la marca no.
const limpiar = (s: string) => s.replace(/[%,()*]/g, " ").trim();

export async function buscar(pn: string, marca: string): Promise<Resultado[]> {
  const supabase = clienteServidor();
  const pnN = normalizarPn(pn);
  const marcaL = limpiar(marca);

  const [cot, cons] = await Promise.all([
    supabase.from("cotizaciones").select("*").ilike("pn_normalizado", `%${pnN}%`).order("fecha", { ascending: false }).limit(500),
    supabase.from("consultas_pn").select("*").ilike("pn_normalizado", `%${pnN}%`).limit(500),
  ]);
  if (cot.error) throw cot.error;
  if (cons.error) throw cons.error;
  const cotizaciones = (cot.data ?? []) as Cotizacion[];
  const consultas = (cons.data ?? []) as ConsultaPn[];

  const ids = new Set<string>();
  cotizaciones.forEach((c) => c.proveedor_id && ids.add(c.proveedor_id));
  consultas.forEach((c) => c.proveedor_id && ids.add(c.proveedor_id));

  const [porPn, porMarca] = await Promise.all([
    ids.size ? supabase.from("proveedores").select("*").in("id", [...ids]) : Promise.resolve({ data: [], error: null }),
    marcaL ? supabase.from("proveedores").select("*").ilike("marcas", `%${marcaL}%`).limit(300) : Promise.resolve({ data: [], error: null }),
  ]);
  if (porPn.error) throw porPn.error;
  if (porMarca.error) throw porMarca.error;
  const proveedores = new Map<string, Proveedor>();
  [...(porPn.data ?? []), ...(porMarca.data ?? [])].forEach((p) => proveedores.set(p.id, p as Proveedor));

  let contactos: Contacto[] = [];
  if (proveedores.size) {
    const r = await supabase.from("contactos").select("*").in("proveedor_id", [...proveedores.keys()]);
    if (r.error) throw r.error;
    contactos = (r.data ?? []) as Contacto[];
  }

  return armarResultados({ pn, marca: marcaL, proveedores: [...proveedores.values()], contactos, cotizaciones, consultas });
}

export async function obtenerBusqueda(id: number): Promise<Busqueda | null> {
  const { data } = await clienteServidor().from("busquedas").select("*").eq("id", id).maybeSingle();
  return (data as Busqueda) ?? null;
}
