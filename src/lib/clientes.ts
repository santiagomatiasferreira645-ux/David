import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cliente, PrecioCliente, Venta } from "./tipos";

export const MONEDAS = ["USD", "PYG", "BRL", "ARS", "EUR"];
export const TIPOS_CLIENTE = ["Naviera", "Astillero", "Minera", "Agroindustria", "Industria", "Taller", "Otro"];
export const ESTADOS_VENTA = ["Vendido", "Presupuestado", "Perdido"] as const;

export type Sugerencia = {
  precio: number;
  moneda: string;
  fuente: "acordado" | "ultima_venta" | "ultimo_presupuesto" | "margen";
  detalle: string;
};

type Costo = { precio: number; moneda: string | null; proveedor?: string | null; fecha?: string | null };

const redondear = (n: number) => Math.round(n * 100) / 100;

// Precio a cobrarle a un cliente por un PN, en este orden:
// 1) el precio acordado vigente; 2) lo último que se le vendió; 3) lo último que se le presupuestó;
// 4) el costo más reciente con el margen del cliente.
export function precioSugerido(p: {
  acordado?: PrecioCliente | null;
  ventas: Pick<Venta, "fecha" | "estado" | "precio_unitario" | "moneda" | "comprobante">[];
  costo?: Costo | null;
  margenPct?: number | null;
  monedaCliente?: string | null;
  hoy?: string;
}): Sugerencia | null {
  const hoy = p.hoy ?? new Date().toISOString().slice(0, 10);
  if (p.acordado && (!p.acordado.vigente_hasta || p.acordado.vigente_hasta >= hoy)) {
    const hasta = p.acordado.vigente_hasta ? ` hasta ${p.acordado.vigente_hasta}` : "";
    return { precio: p.acordado.precio, moneda: p.acordado.moneda, fuente: "acordado", detalle: `Precio acordado${hasta}` };
  }
  const conPrecio = p.ventas.filter((v) => v.precio_unitario != null).sort((a, b) => b.fecha.localeCompare(a.fecha));
  for (const [estado, fuente, texto] of [
    ["Vendido", "ultima_venta", "Última venta"],
    ["Presupuestado", "ultimo_presupuesto", "Último presupuesto"],
  ] as const) {
    const v = conPrecio.find((x) => x.estado === estado);
    if (v) {
      const comp = v.comprobante ? ` · ${v.comprobante}` : "";
      return { precio: v.precio_unitario!, moneda: v.moneda ?? p.monedaCliente ?? "USD", fuente, detalle: `${texto} el ${v.fecha}${comp}` };
    }
  }
  if (p.costo && p.margenPct != null) {
    const prov = p.costo.proveedor ? ` de ${p.costo.proveedor}` : "";
    return {
      precio: redondear(p.costo.precio * (1 + p.margenPct / 100)),
      moneda: p.costo.moneda ?? p.monedaCliente ?? "USD",
      fuente: "margen",
      detalle: `Costo ${p.costo.precio.toLocaleString("es")} ${p.costo.moneda ?? ""}${prov} + ${p.margenPct}%`,
    };
  }
  return null;
}

// Margen sobre costo de un renglón: (precio - costo) / costo, en %. Null si falta alguno.
export function margenDe(precio: number | null, costo: number | null): number | null {
  if (precio == null || costo == null || costo <= 0) return null;
  return Math.round(((precio - costo) / costo) * 1000) / 10;
}

// Lista de dominios cargada como texto ("hbsa.com.py, @lhgmining.com.br") a minúsculas y sin "@".
export function listaDominios(texto: string | null | undefined): string[] {
  return (texto ?? "")
    .split(/[\s,;]+/)
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

// Cliente al que pertenece un mail, por el dominio (también subdominios: py.hbsa.com.py → hbsa.com.py).
export function clientePorEmail<T extends Pick<Cliente, "dominios">>(email: string | null | undefined, clientes: T[]): T | null {
  const dominio = email?.split("@")[1]?.trim().toLowerCase();
  if (!dominio) return null;
  return clientes.find((c) => listaDominios(c.dominios).some((d) => dominio === d || dominio.endsWith("." + d))) ?? null;
}

type DatosCliente = Partial<Omit<Cliente, "id">> & { empresa: string };

// Inserta un cliente con el próximo número libre (C0001...). Si ya hay uno con el mismo nombre, devuelve ese.
export async function crearCliente(supabase: SupabaseClient, datos: DatosCliente): Promise<{ id?: string; existente?: boolean; error?: string }> {
  const { data: existente } = await supabase.from("clientes").select("id").ilike("empresa", datos.empresa.replace(/[%_]/g, " ")).limit(1).maybeSingle();
  if (existente) return { id: existente.id, existente: true };

  for (let intento = 0; intento < 3; intento++) {
    const { data: ultimo } = await supabase.from("clientes").select("id").like("id", "C%").order("id", { ascending: false }).limit(1).maybeSingle();
    const numero = Number(ultimo?.id?.slice(1) ?? 0) + 1 + intento;
    const id = `C${String(numero).padStart(4, "0")}`;
    const { error } = await supabase.from("clientes").insert({ ...datos, id });
    if (error?.code === "23505") continue; // otro usuario tomó el mismo id al mismo tiempo
    if (error) return { error: error.message };
    return { id };
  }
  return { error: "No se pudo asignar un número de cliente. Probá de nuevo." };
}

export function formatoPrecio(n: number | null | undefined, moneda?: string | null): string {
  if (n == null) return "—";
  return `${n.toLocaleString("es", { maximumFractionDigits: 2 })} ${moneda ?? ""}`.trim();
}
