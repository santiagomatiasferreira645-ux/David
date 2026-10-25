import "server-only";
import { linkPagina } from "./catalogo";
import { normalizarPn } from "./pn";
import { clienteServidor } from "./supabase/servidor";

export const MAX_PN = 200;

export type HojaCatalogo = { catalogo: string; pagina: number | null; link: string };
export type PrecioPn = { precio: number; moneda: string | null; proveedor: string; fecha: string };

export type ResumenPn = {
  pn: string;
  descripcionCatalogo: string | null;
  hojas: HojaCatalogo[];
  proveedores: number;
  conPrecio: number;
  ultimoPrecio: PrecioPn | null;
};

// Resumen de muchos PN con pocas consultas: catálogo de fábrica, proveedores que lo cotizaron o
// fueron consultados, y el último precio. Compara el PN exacto (normalizado); la búsqueda de un PN
// solo, que se abre desde cada renglón, además encuentra coincidencias parciales y proveedores de la marca.
export async function resumirPn(pns: string[]): Promise<ResumenPn[]> {
  const supabase = clienteServidor();
  const claves = Array.from(new Set(pns.map(normalizarPn).filter(Boolean)));
  if (!claves.length) return [];

  const [cat, cot, cons] = await Promise.all([
    supabase.from("catalogo_pn").select("catalogo, archivo, pn, pn_normalizado, descripcion, pagina").in("pn_normalizado", claves).order("pagina").limit(5000),
    supabase
      .from("cotizaciones")
      .select("proveedor_id, pn_normalizado, precio_unitario, moneda, fecha")
      .in("pn_normalizado", claves)
      .order("fecha", { ascending: false })
      .limit(5000),
    supabase.from("consultas_pn").select("proveedor_id, pn_normalizado").in("pn_normalizado", claves).limit(5000),
  ]);
  if (cat.error) throw cat.error;
  if (cot.error) throw cot.error;
  if (cons.error) throw cons.error;

  const conPrecioIds = Array.from(new Set((cot.data ?? []).filter((c) => c.precio_unitario != null && c.proveedor_id).map((c) => c.proveedor_id!)));
  const nombres = new Map<string, string>();
  if (conPrecioIds.length) {
    const { data, error } = await supabase.from("proveedores").select("id, empresa").in("id", conPrecioIds);
    if (error) throw error;
    (data ?? []).forEach((p) => nombres.set(p.id, p.empresa));
  }

  return pns.map((pn) => {
    const clave = normalizarPn(pn);
    const filas = (cat.data ?? []).filter((f) => f.pn_normalizado === clave);
    const hojas = filas
      .filter((f, i) => filas.findIndex((g) => g.archivo === f.archivo && g.pagina === f.pagina) === i)
      .slice(0, 4)
      .map((f) => ({ catalogo: f.catalogo, pagina: f.pagina, link: linkPagina(f) }));
    const cotizaciones = (cot.data ?? []).filter((c) => c.pn_normalizado === clave);
    const consultas = (cons.data ?? []).filter((c) => c.pn_normalizado === clave);
    const proveedores = new Set([...cotizaciones, ...consultas].map((c) => c.proveedor_id).filter(Boolean));
    const conPrecio = cotizaciones.filter((c) => c.precio_unitario != null);
    const ultima = conPrecio[0];
    return {
      pn,
      descripcionCatalogo: filas.find((f) => f.descripcion)?.descripcion ?? null,
      hojas,
      proveedores: proveedores.size,
      conPrecio: new Set(conPrecio.map((c) => c.proveedor_id)).size,
      ultimoPrecio: ultima
        ? { precio: ultima.precio_unitario!, moneda: ultima.moneda, proveedor: nombres.get(ultima.proveedor_id ?? "") ?? "Proveedor", fecha: ultima.fecha }
        : null,
    };
  });
}
