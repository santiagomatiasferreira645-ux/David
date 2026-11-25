// Servicios presupuestados (propios o de proveedores parceros), consultados como precio de referencia.

export const CATEGORIAS_SERVICIO = [
  "Overhaul",
  "Reparación",
  "Mano de obra",
  "Rectificado",
  "Inspección / diagnóstico",
  "Montaje / instalación",
  "Flete / logística",
  "Otro",
] as const;

export const ESTADOS_SERVICIO = ["presupuestado", "aprobado", "realizado", "perdido"] as const;

export const UNIDADES_SERVICIO = ["servicio", "global", "hora", "día", "unidad", "km"];

export type Prestador = "propio" | "proveedor";

export type Servicio = {
  id: number;
  prestador: Prestador;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  categoria: string;
  descripcion: string;
  marca: string | null;
  modelo_motor: string | null;
  equipo: string | null;
  cliente: string | null;
  cliente_id: string | null;
  lugar: string | null;
  fecha: string | null;
  cantidad: number | null;
  unidad: string | null;
  precio: number | null;
  moneda: string | null;
  plazo_dias: number | null;
  estado: (typeof ESTADOS_SERVICIO)[number];
  presupuesto_id: number | null;
  origen: string | null;
  notas: string | null;
};

// Columnas donde se busca el texto libre.
export const COLUMNAS_BUSQUEDA = ["descripcion", "categoria", "marca", "modelo_motor", "equipo", "cliente", "lugar", "proveedor_nombre", "notas"];

// "overhaul 16-645, culata" -> ["overhaul", "16-645", "culata"]. Sin caracteres que rompen el filtro de Supabase.
export function palabrasBusqueda(texto: string | undefined): string[] {
  return (texto ?? "")
    .replace(/[%,()*\\"]/g, " ")
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .slice(0, 6);
}

// Filtro .or() de Supabase para una palabra: tiene que aparecer en alguna de las columnas.
export function filtroPalabra(palabra: string): string {
  return COLUMNAS_BUSQUEDA.map((c) => `${c}.ilike.%${palabra}%`).join(",");
}

export type ResumenMoneda = {
  moneda: string;
  unidad: string; // "" = precio por servicio o global; si no, "hora", "día"...
  cantidad: number;
  minimo: number;
  maximo: number;
  ultimo: { precio: number; fecha: string | null };
};

// Precio de referencia por moneda y unidad (no se mezcla un precio por hora con uno por servicio):
// cuántos hay, el más bajo, el más alto y el más reciente. Los perdidos también cuentan: el precio se presupuestó igual.
export function resumenPrecios(servicios: Pick<Servicio, "precio" | "moneda" | "fecha" | "unidad">[]): ResumenMoneda[] {
  const grupos = new Map<string, ResumenMoneda>();
  for (const s of servicios) {
    if (s.precio == null || !Number.isFinite(s.precio)) continue;
    const moneda = s.moneda?.trim().toUpperCase() || "—";
    const unidad = textoUnidad(s.unidad) ? s.unidad!.trim().toLowerCase() : "";
    const clave = `${moneda}|${unidad}`;
    const r = grupos.get(clave);
    if (!r) {
      grupos.set(clave, { moneda, unidad, cantidad: 1, minimo: s.precio, maximo: s.precio, ultimo: { precio: s.precio, fecha: s.fecha } });
      continue;
    }
    r.cantidad++;
    r.minimo = Math.min(r.minimo, s.precio);
    r.maximo = Math.max(r.maximo, s.precio);
    if ((s.fecha ?? "") > (r.ultimo.fecha ?? "")) r.ultimo = { precio: s.precio, fecha: s.fecha };
  }
  return [...grupos.values()].sort((a, b) => b.cantidad - a.cantidad);
}

export function formatoPrecio(valor: number | null, moneda: string | null): string {
  if (valor == null) return "sin precio";
  return `${valor.toLocaleString("es", { maximumFractionDigits: 2 })} ${moneda ?? ""}`.trim();
}

// "por hora", "por día"... vacío para un precio global o por servicio.
export function textoUnidad(unidad: string | null): string {
  const u = unidad?.trim().toLowerCase();
  if (!u || u === "servicio" || u === "global") return "";
  return `por ${u}`;
}
