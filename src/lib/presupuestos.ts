// Tipos y reglas de los presupuestos históricos, sin dependencias del servidor (se prueban en tests/presupuestos.test.ts).

// Mismos valores que el check de servicios.categoria (migración 0008).
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

export type ItemLeido = {
  clase: "repuesto" | "servicio";
  pn: string | null;
  marca: string | null;
  descripcion: string;
  modelo_motor: string | null;
  cantidad: number | null;
  unidad: string | null;
  precio_unitario: number | null;
  moneda: string | null;
  plazo_dias: number | null;
  categoria: string;
  notas: string | null;
};

export type PresupuestoLeido = {
  tipo: "propio" | "proveedor";
  empresa: string | null;
  numero: string | null;
  fecha: string | null;
  cliente: string | null;
  proveedor: string | null;
  moneda: string | null;
  total: number | null;
  condiciones: string | null;
  items: ItemLeido[];
};

export type Presupuesto = {
  id: number;
  tipo: "propio" | "proveedor" | null;
  empresa: string | null;
  numero: string | null;
  fecha: string | null;
  cliente: string | null;
  cliente_id: string | null;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
  moneda: string | null;
  total: number | null;
  condiciones: string | null;
  archivo: string;
  nombre_archivo: string | null;
  estado: "procesando" | "listo" | "error";
  error: string | null;
  notas: string | null;
  creado_en: string;
};

export type ItemPresupuesto = {
  id: number;
  presupuesto_id: number;
  clase: "repuesto" | "servicio";
  pn: string | null;
  pn_normalizado: string | null;
  marca: string | null;
  descripcion: string | null;
  modelo_motor: string | null;
  cantidad: number | null;
  unidad: string | null;
  precio_unitario: number | null;
  moneda: string | null;
  plazo_dias: number | null;
  notas: string | null;
};

export const TIPO_TEXTO = { propio: "Nuestro presupuesto", proveedor: "De proveedor" } as const;

// Archivos que la IA puede leer: PDF y fotos directo, Excel y CSV pasados a texto.
export const EXTENSIONES = ["pdf", "jpg", "jpeg", "png", "webp", "gif", "xlsx", "csv", "txt"] as const;
export const MAX_BYTES = 15 * 1024 * 1024;

export function extension(nombre: string): string {
  return nombre.split(".").pop()?.toLowerCase() ?? "";
}

export function archivoAceptado(nombre: string): boolean {
  return (EXTENSIONES as readonly string[]).includes(extension(nombre));
}

// "Presupuesto Nº 123 (final).pdf" -> "1731160000000-presupuesto-n-123-final.pdf"
export function rutaArchivo(nombre: string, ahora = Date.now()): string {
  const ext = extension(nombre);
  const base = nombre
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${ahora}-${base || "presupuesto"}.${ext}`;
}

const texto = (t: unknown): string | null => {
  if (typeof t !== "string") return null;
  const limpio = t.trim();
  return limpio && limpio.toLowerCase() !== "null" ? limpio : null;
};
const num = (n: unknown): number | null => (typeof n === "number" && Number.isFinite(n) ? n : null);

// Solo fechas reales AAAA-MM-DD, para que la columna date no rechace el insert.
export function fechaValida(f: unknown): string | null {
  const t = texto(f);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t ? t : null;
}

export function monedaValida(m: unknown): string | null {
  const t = texto(m)?.toUpperCase();
  if (!t) return null;
  if (t === "US$" || t === "U$S" || t === "$US" || t === "DOLARES") return "USD";
  if (t === "€") return "EUR";
  if (t === "R$") return "BRL";
  return t.slice(0, 5);
}

// Ordena y limpia lo que devolvió la IA: descarta renglones vacíos y fuerza la categoría de servicio a la lista permitida.
export function limpiarLeido(l: PresupuestoLeido): PresupuestoLeido {
  const moneda = monedaValida(l.moneda);
  const items = (l.items ?? [])
    .map((i) => {
      const clase: ItemLeido["clase"] = i.clase === "servicio" ? "servicio" : "repuesto";
      const pn = texto(i.pn);
      return {
        clase,
        pn: pn && /[0-9A-Za-z]{2,}/.test(pn) ? pn : null,
        marca: texto(i.marca),
        descripcion: texto(i.descripcion) ?? pn ?? "",
        modelo_motor: texto(i.modelo_motor),
        cantidad: num(i.cantidad),
        unidad: texto(i.unidad),
        precio_unitario: num(i.precio_unitario),
        moneda: monedaValida(i.moneda) ?? moneda,
        plazo_dias: num(i.plazo_dias) != null ? Math.round(i.plazo_dias!) : null,
        categoria: clase === "servicio" && (CATEGORIAS_SERVICIO as readonly string[]).includes(i.categoria) ? i.categoria : "Otro",
        notas: texto(i.notas),
      };
    })
    .filter((i) => i.descripcion);
  return {
    tipo: l.tipo === "proveedor" ? "proveedor" : "propio",
    empresa: texto(l.empresa),
    numero: texto(l.numero),
    fecha: fechaValida(l.fecha),
    cliente: texto(l.cliente),
    proveedor: texto(l.proveedor),
    moneda,
    total: num(l.total),
    condiciones: texto(l.condiciones),
    items,
  };
}

const simplificar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?a\.?|s\.?r\.?l\.?|ltda?\.?|inc\.?|llc|corp\.?|co\.?|sas|eireli|me)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Busca en una lista {id, nombre} el que coincide con el nombre del presupuesto ("Wärtsilä Argentina S.A." = "Wartsila Argentina").
export function buscarPorNombre<T extends { id: string; nombre: string }>(lista: T[], nombre: string | null): T | null {
  if (!nombre) return null;
  const buscado = simplificar(nombre);
  if (buscado.length < 3) return null;
  const exacto = lista.find((x) => simplificar(x.nombre) === buscado);
  if (exacto) return exacto;
  // Uno contiene al otro, con al menos 5 letras en común para no unir "Diesel" con cualquiera.
  const candidatos = lista.filter((x) => {
    const n = simplificar(x.nombre);
    return n.length >= 5 && buscado.length >= 5 && (n.includes(buscado) || buscado.includes(n));
  });
  return candidatos.length === 1 ? candidatos[0] : null;
}

// Renglón de la tabla servicios (migración 0008) a partir de un ítem de servicio.
export function filaServicio(
  i: ItemLeido,
  p: { id: number; tipo: "propio" | "proveedor"; proveedor_id: string | null; proveedor_nombre: string | null; cliente: string | null; fecha: string | null },
) {
  return {
    prestador: p.tipo,
    proveedor_id: p.tipo === "proveedor" ? p.proveedor_id : null,
    proveedor_nombre: p.tipo === "proveedor" ? p.proveedor_nombre : null,
    categoria: i.categoria,
    descripcion: i.descripcion,
    marca: i.marca,
    modelo_motor: i.modelo_motor,
    cliente: p.cliente,
    fecha: p.fecha,
    cantidad: i.cantidad,
    unidad: i.unidad,
    precio: i.precio_unitario,
    moneda: i.moneda,
    plazo_dias: i.plazo_dias,
    estado: "presupuestado",
    presupuesto_id: p.id,
    origen: "Presupuesto histórico",
    notas: i.notas,
  };
}

// Caracteres con significado en los filtros de PostgREST (or=, ilike).
export const limpiarFiltro = (s: string) => s.replace(/[%,()*\\]/g, " ").trim();
