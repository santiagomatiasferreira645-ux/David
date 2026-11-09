import { nombrePrincipal } from "./marcas";
import { normalizarPn } from "./pn";

export const CONDICIONES_STOCK = ["Nuevo original", "Nuevo OEM", "Alternativo", "Usado", "Reacondicionado"] as const;
export const MONEDAS_STOCK = ["USD", "EUR", "ARS", "BRL", "PYG", "UYU", "CNY"];
export const TIPOS_MOVIMIENTO = ["ingreso", "egreso", "transferencia", "ajuste"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const TEXTO_MOVIMIENTO: Record<TipoMovimiento, string> = {
  ingreso: "Ingreso",
  egreso: "Egreso",
  transferencia: "Transferencia",
  ajuste: "Ajuste",
};

export type Deposito = { id: number; nombre: string; ubicacion: string | null; notas: string | null; activo: boolean };

export type Existencia = { deposito_id: number; cantidad: number; ubicacion: string | null };

export type ArticuloStock = {
  id: number;
  pn: string;
  pn_normalizado: string;
  marca: string | null;
  descripcion: string | null;
  modelo_motor: string | null;
  condicion: string;
  costo_unitario: number | null;
  precio_venta: number | null;
  moneda: string;
  notas: string | null;
  actualizado_en: string;
  stock_existencias: Existencia[];
};

export const COLUMNAS_ARTICULO =
  "id, pn, pn_normalizado, marca, descripcion, modelo_motor, condicion, costo_unitario, precio_venta, moneda, notas, actualizado_en, stock_existencias (deposito_id, cantidad, ubicacion)";

export const totalDe = (a: Pick<ArticuloStock, "stock_existencias">) =>
  a.stock_existencias.reduce((s, e) => s + Number(e.cantidad), 0);

export const formatoCantidad = (n: number) => n.toLocaleString("es", { maximumFractionDigits: 2 });

export const formatoPrecio = (n: number | null, moneda: string | null) =>
  n == null ? null : `${n.toLocaleString("es", { maximumFractionDigits: 2 })} ${moneda ?? ""}`.trim();

// La marca siempre con su nombre principal (CAT y no Caterpillar), así no se duplica el artículo.
export const marcaStock = (marca: string | null | undefined) => (marca?.trim() ? nombrePrincipal(marca) : null);

type FilaMovimiento = { articulo_id: number; deposito_id: number; tipo: TipoMovimiento; cantidad: number; referencia: string | null; notas: string | null };

// Las filas que hay que guardar para un movimiento. Una transferencia son dos filas (sale de uno y entra
// en el otro) y un ajuste guarda solo la diferencia con lo que había.
export function filasDeMovimiento(m: {
  articuloId: number;
  tipo: TipoMovimiento;
  depositoId: number;
  destinoId?: number | null;
  cantidad: number;
  actual?: number;
  referencia?: string | null;
  notas?: string | null;
}): FilaMovimiento[] | string {
  const base = { articulo_id: m.articuloId, tipo: m.tipo, referencia: m.referencia || null, notas: m.notas || null };
  if (!Number.isFinite(m.cantidad) || m.cantidad < 0) return "La cantidad tiene que ser un número positivo.";
  if (m.tipo === "ajuste") {
    const diferencia = m.cantidad - (m.actual ?? 0);
    if (diferencia === 0) return "La cantidad es la misma que ya había: no hay nada que ajustar.";
    return [{ ...base, deposito_id: m.depositoId, cantidad: diferencia }];
  }
  if (m.cantidad === 0) return "La cantidad tiene que ser mayor que cero.";
  if (m.tipo === "ingreso") return [{ ...base, deposito_id: m.depositoId, cantidad: m.cantidad }];
  if (m.tipo === "egreso") {
    if (m.actual != null && m.cantidad > m.actual) return `En ese depósito hay ${formatoCantidad(m.actual)}: no se puede sacar ${formatoCantidad(m.cantidad)}.`;
    return [{ ...base, deposito_id: m.depositoId, cantidad: -m.cantidad }];
  }
  if (!m.destinoId || m.destinoId === m.depositoId) return "Elegí un depósito de destino distinto del de origen.";
  if (m.actual != null && m.cantidad > m.actual) return `En el depósito de origen hay ${formatoCantidad(m.actual)}: no se puede pasar ${formatoCantidad(m.cantidad)}.`;
  return [
    { ...base, deposito_id: m.depositoId, cantidad: -m.cantidad },
    { ...base, deposito_id: m.destinoId, cantidad: m.cantidad },
  ];
}

// ---- Carga masiva pegando desde Excel ----

export type FilaImportada = {
  pn: string;
  marca: string | null;
  descripcion: string | null;
  cantidad: number;
  deposito: string | null;
  ubicacion: string | null;
  condicion: string | null;
  costo: number | null;
  precio: number | null;
  moneda: string | null;
};

const CABECERAS: [keyof FilaImportada, RegExp][] = [
  ["pn", /^(p\/?n|part ?(n|#|number)|n[uú]mero de parte|c[oó]d(igo)?|ref(erencia)?)\b/i],
  ["marca", /^(marca|brand|fabricante)/i],
  ["descripcion", /^(desc|detalle|nombre|art[ií]culo|producto)/i],
  ["cantidad", /^(cant|qty|q\.?ty|stock|existencia|unid|uds)/i],
  ["deposito", /^(dep[oó]sito|almac[eé]n|warehouse|lugar)/i],
  ["ubicacion", /^(ubicaci[oó]n|estante|sector|caja|location|bin)/i],
  ["condicion", /^(condici[oó]n|estado|tipo)/i],
  ["costo", /^(costo|cost)/i],
  ["precio", /^(precio|price|venta|pvp)/i],
  ["moneda", /^(moneda|currency|mon)\b/i],
];

// "1.234,50" o "1,234.50" o "1234.5" -> 1234.5. Vacío o ilegible -> null.
export function leerNumero(s: string | undefined): number | null {
  let t = (s ?? "").replace(/[^\d.,-]/g, "");
  if (!t) return null;
  const coma = t.lastIndexOf(",");
  const punto = t.lastIndexOf(".");
  if (coma > punto) t = t.replace(/\./g, "").replace(",", ".");
  else if (punto > coma && coma >= 0) t = t.replace(/,/g, "");
  else if (coma < 0 && /^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const condicionValida = (s: string | undefined) => {
  const t = (s ?? "").trim().toLowerCase();
  if (!t) return null;
  if (/reacond|recon|rebuilt/.test(t)) return "Reacondicionado";
  if (/usad|used/.test(t)) return "Usado";
  if (/altern|after/.test(t)) return "Alternativo";
  if (/oem/.test(t)) return "Nuevo OEM";
  if (/orig|nuev|new|genuin/.test(t)) return "Nuevo original";
  return null;
};

// Lo que se pega desde una planilla: la primera fila son los títulos de columna (PN, Marca, Descripción,
// Cantidad, Depósito, Ubicación, Condición, Costo, Precio, Moneda; alcanza con PN y Cantidad).
// El mismo PN, marca, condición y depósito repetido va una sola vez con las cantidades sumadas.
export function leerStockPegado(texto: string): { filas: FilaImportada[]; error?: string } {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (lineas.length < 2) return { filas: [], error: "Pegá la planilla con la fila de títulos y al menos un artículo." };
  const separador = lineas[0].includes("\t") ? "\t" : lineas[0].includes(";") ? ";" : ",";
  const celdas = lineas.map((l) => l.split(separador).map((c) => c.trim()));
  const indice = new Map<keyof FilaImportada, number>();
  celdas[0].forEach((titulo, i) => {
    const campo = CABECERAS.find(([k, re]) => !indice.has(k) && re.test(titulo))?.[0];
    if (campo) indice.set(campo, i);
  });
  if (!indice.has("pn")) return { filas: [], error: "No encontré la columna del PN: la primera fila tiene que tener los títulos (PN, Marca, Cantidad...)." };

  const tomar = (f: string[], k: keyof FilaImportada) => (indice.has(k) ? f[indice.get(k)!]?.trim() || undefined : undefined);
  const porClave = new Map<string, FilaImportada>();
  for (const f of celdas.slice(1)) {
    const pn = tomar(f, "pn");
    if (!pn || !normalizarPn(pn)) continue;
    const fila: FilaImportada = {
      pn,
      marca: marcaStock(tomar(f, "marca")),
      descripcion: tomar(f, "descripcion") ?? null,
      cantidad: Math.max(0, leerNumero(tomar(f, "cantidad")) ?? 0),
      deposito: tomar(f, "deposito") ?? null,
      ubicacion: tomar(f, "ubicacion") ?? null,
      condicion: condicionValida(tomar(f, "condicion")),
      costo: leerNumero(tomar(f, "costo")),
      precio: leerNumero(tomar(f, "precio")),
      moneda: tomar(f, "moneda")?.toUpperCase().slice(0, 3) ?? null,
    };
    const clave = [normalizarPn(pn), (fila.marca ?? "").toLowerCase(), fila.condicion ?? "", (fila.deposito ?? "").toLowerCase()].join("|");
    const previa = porClave.get(clave);
    if (previa) {
      previa.cantidad += fila.cantidad;
      previa.descripcion ??= fila.descripcion;
      previa.precio ??= fila.precio;
      previa.costo ??= fila.costo;
    } else porClave.set(clave, fila);
  }
  const filas = Array.from(porClave.values());
  return filas.length ? { filas } : { filas, error: "No encontré ningún PN en lo que pegaste." };
}
