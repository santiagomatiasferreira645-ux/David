// Reglas de "Emitir presupuesto", sin dependencias del servidor (se prueban en tests/presupuesto-emitido.test.ts).

export const MEMBRETES = {
  daysa: {
    nombre: "DAYSA",
    razonSocial: "David Esteban Ferreira Agafonoff",
    separador: "/",
    cierre: ["Aguardamos sus comentarios.", "Saludos cordiales."],
    firma: { nombre: "David E. Ferreira Agafonoff", cargo: "DAYSA", lineas: ["davidf@daysa.com.py · +595 971 598 512"] },
  },
  "tecnica-naval": {
    nombre: "Técnica Naval y Servicios",
    razonSocial: "Técnica Naval y Servicios",
    separador: "-",
    cierre: ["Sin otro particular, lo saluda muy atentamente."],
    firma: { nombre: "Ing. Roberto Coniglio", cargo: "Responsable Técnico", lineas: ["Técnica Naval y Servicios"] },
  },
} as const;
export type Membrete = keyof typeof MEMBRETES;
export const esMembrete = (m: unknown): m is Membrete => typeof m === "string" && m in MEMBRETES;

export const MODELOS = {
  repuestos: { texto: "Repuestos", detalle: "Tabla de PN, cantidad y precio" },
  "repuestos-servicios": { texto: "Repuestos + mano de obra / logística", detalle: "Tabla y cuadro de detalle con precio" },
  servicios: { texto: "Servicios", detalle: "Solo el detalle del trabajo con su precio" },
} as const;
export type Modelo = keyof typeof MODELOS;
export const esModelo = (m: unknown): m is Modelo => typeof m === "string" && m in MODELOS;
export const llevaTabla = (m: Modelo) => m !== "servicios";
export const llevaDetalle = (m: Modelo) => m !== "repuestos";
export const tituloDetalle = (m: Modelo) => (m === "servicios" ? "Detalle del servicio" : "Mano de obra y costos logísticos");

export const PLAZOS_PAGO = ["30 días", "45 días", "60 días"] as const;
export const MONEDA = "USD";
export const LEYENDA_IVA = "PRECIOS IVA INCLUIDO";

export type Renglon = { pn: string; descripcion: string; cantidad: number | null; precio: number | null };
export type Detalle = { descripcion: string; precio: number | null };

export type PresupuestoEmitido = {
  id?: number;
  membrete: Membrete;
  modelo: Modelo;
  numero: string;
  fecha: string; // AAAA-MM-DD
  lugar: string; // "Asunción"
  cliente: string;
  atencion: string;
  referencia: string;
  referencia_detalle: string;
  renglones: Renglon[];
  detalles: Detalle[];
  entrega_dias: number | null;
  plazo_pago: string;
  oferta_dias: number | null;
  aclaraciones: string;
  lugar_entrega: string;
};

const redondear = (n: number) => Math.round(n * 100) / 100;

// Valorizado = cantidad × precio unitario. El total es la suma del valorizado (nunca de los precios unitarios).
export const valorizado = (r: Pick<Renglon, "cantidad" | "precio">) => (r.cantidad != null && r.precio != null ? redondear(r.cantidad * r.precio) : null);
export const totalRenglones = (rs: Renglon[]) => redondear(rs.reduce((s, r) => s + (valorizado(r) ?? 0), 0));
export const totalDetalles = (ds: Detalle[]) => redondear(ds.reduce((s, d) => s + (d.precio ?? 0), 0));

// Solo cuenta lo que se muestra según el modelo: la tabla, el detalle o los dos.
export function totales(p: Pick<PresupuestoEmitido, "modelo" | "renglones" | "detalles">) {
  const repuestos = llevaTabla(p.modelo) ? totalRenglones(p.renglones) : 0;
  const servicios = llevaDetalle(p.modelo) ? totalDetalles(p.detalles) : 0;
  return { repuestos, servicios, total: redondear(repuestos + servicios) };
}

export const formatoPrecio = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const precioUsd = (n: number) => `${MONEDA} ${formatoPrecio(n)}`;
export const formatoCantidad = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 3 });

// Número que se sugiere para el próximo presupuesto: el último de esa empresa + 1, con el año actual
// (DAYSA usa "26133/26", Técnica Naval "1301-25"). Sin presupuestos previos, queda para escribirlo a mano.
export function numeroSiguiente(ultimos: (string | null)[], membrete: Membrete, hoy = new Date()): string {
  const anio = String(hoy.getFullYear()).slice(-2);
  const numeros = ultimos.map((n) => Number(/^\s*(\d+)/.exec(n ?? "")?.[1])).filter((n) => Number.isFinite(n) && n > 0);
  if (!numeros.length) return "";
  return `${Math.max(...numeros) + 1}${MEMBRETES[membrete].separador}${anio}`;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
// "Asunción, 16 de octubre de 2026"
export function fechaLarga(fecha: string, lugar: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  const texto = m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : fecha;
  return lugar.trim() ? `${lugar.trim()}, ${texto}` : texto;
}

// Las 5 condiciones de la oferta, como se imprimen.
export function condiciones(p: Pick<PresupuestoEmitido, "entrega_dias" | "plazo_pago" | "oferta_dias" | "aclaraciones" | "lugar_entrega">): [string, string][] {
  const dias = (n: number | null) => (n == null ? "" : `${n} ${n === 1 ? "día" : "días"}`);
  return [
    ["Tiempo de entrega", dias(p.entrega_dias)],
    ["Plazo de pago", p.plazo_pago.trim()],
    ["Mantenimiento de oferta", dias(p.oferta_dias)],
    ["Aclaraciones", p.aclaraciones.trim()],
    ["Lugar de entrega", p.lugar_entrega.trim()],
  ];
}

// Número escrito a mano o copiado: "1.234,56", "1,234.56", "12,5", "6.850", "USD 70". Vacío o inválido → null.
export function aNumero(s: string): number | null {
  let t = s.trim().replace(/[^\d.,-]/g, "");
  if (!t) return null;
  if (t.includes(",") && t.includes(".")) t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (t.includes(","))
    t = t.replace(",", "."); // coma decimal, como se escribe acá
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ""); // "6.850" = seis mil ochocientos cincuenta
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Pegar desde Excel: una fila por renglón, columnas separadas por tabulación. Acepta PN · Descripción · Cantidad · Precio,
// o con el número de ítem adelante, o PN · Cantidad · Precio. La columna Valorizado, si viene, se ignora.
export function leerPegado(texto: string): Renglon[] {
  const numero = (s: string | undefined) => (s ? aNumero(s) : null);
  const esNumero = (s: string | undefined) => !!s && /^\s*[\d.,\s$USD-]+\s*$/i.test(s) && numero(s) != null;
  return texto
    .split(/\r?\n/)
    .map((l) => l.split("\t").map((c) => c.trim()))
    .filter((c) => c.some(Boolean))
    .map((c) => {
      if (c.length >= 4 && /^\d{1,3}$/.test(c[0]) && c[2] && !esNumero(c[2])) c = c.slice(1); // número de ítem: 1 · PN · Descripción · ...
      const [pn = "", segunda, ...resto] = c;
      if (esNumero(segunda)) return { pn, descripcion: "", cantidad: numero(segunda), precio: numero(resto[0]) };
      return { pn, descripcion: segunda ?? "", cantidad: numero(resto[0]), precio: numero(resto[1]) };
    });
}

// Revisa y limpia lo que llega del formulario antes de guardar.
export function validar(p: PresupuestoEmitido): { ok: true; datos: PresupuestoEmitido } | { ok: false; error: string } {
  if (!esMembrete(p.membrete)) return { ok: false, error: "Elegí el membrete." };
  if (!esModelo(p.modelo)) return { ok: false, error: "Elegí el tipo de presupuesto." };
  if (!p.cliente?.trim()) return { ok: false, error: "Falta el cliente." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha ?? "")) return { ok: false, error: "Falta la fecha." };
  const renglones = llevaTabla(p.modelo) ? (p.renglones ?? []).filter((r) => r.pn?.trim() || r.descripcion?.trim()) : [];
  const detalles = llevaDetalle(p.modelo) ? (p.detalles ?? []).filter((d) => d.descripcion?.trim()) : [];
  if (llevaTabla(p.modelo) && !renglones.length) return { ok: false, error: "Cargá al menos un renglón en la tabla." };
  if (p.modelo === "servicios" && !detalles.length) return { ok: false, error: "Escribí el detalle del servicio." };
  const t = (s: string | null | undefined) => (s ?? "").trim();
  const entero = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? null : Math.max(0, Math.round(n)));
  return {
    ok: true,
    datos: {
      ...p,
      numero: t(p.numero),
      lugar: t(p.lugar),
      cliente: t(p.cliente),
      atencion: t(p.atencion),
      referencia: t(p.referencia),
      referencia_detalle: t(p.referencia_detalle),
      renglones: renglones.map((r) => ({ pn: t(r.pn), descripcion: t(r.descripcion), cantidad: r.cantidad, precio: r.precio })),
      detalles: detalles.map((d) => ({ descripcion: t(d.descripcion), precio: d.precio })),
      entrega_dias: entero(p.entrega_dias),
      plazo_pago: t(p.plazo_pago),
      oferta_dias: entero(p.oferta_dias),
      aclaraciones: t(p.aclaraciones),
      lugar_entrega: t(p.lugar_entrega),
    },
  };
}

export function nuevoPresupuesto(membrete: Membrete = "daysa", modelo: Modelo = "repuestos"): PresupuestoEmitido {
  return {
    membrete,
    modelo,
    numero: "",
    fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Asuncion" }),
    lugar: "Asunción",
    cliente: "",
    atencion: "",
    referencia: "",
    referencia_detalle: "",
    renglones: [{ pn: "", descripcion: "", cantidad: 1, precio: null }],
    detalles: [{ descripcion: "", precio: null }],
    entrega_dias: null,
    plazo_pago: "30 días",
    oferta_dias: 15,
    aclaraciones: "",
    lugar_entrega: "",
  };
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
export const nombreArchivo = (p: Pick<PresupuestoEmitido, "membrete" | "numero" | "cliente">) =>
  `presupuesto_${[MEMBRETES[p.membrete].nombre, p.numero, p.cliente].map(slug).filter(Boolean).join("_")}.pdf`;

// Categoría del módulo de Servicios para un renglón del cuadro de detalle (mismas reglas que 0010_servicios_desde_presupuestos.sql).
export function categoriaServicio(descripcion: string, modelo: Modelo): string {
  const d = descripcion;
  if (/overhaul|top ?end|media vida|reparaci[oó]n general|major/i.test(d)) return "Overhaul";
  if (/rectific|encamis|metaliz|bru[nñ]id/i.test(d)) return "Rectificado";
  if (/flete|transporte|traslado|env[ií]o|log[ií]stic|courier|despacho/i.test(d)) return "Flete / logística";
  if (/inspecc|diagn[oó]st|revisi[oó]n|boroscop|an[aá]lisis|prueba|ensayo/i.test(d)) return "Inspección / diagnóstico";
  if (/montaje|desmontaje|instalaci|alineaci/i.test(d)) return "Montaje / instalación";
  if (/repar/i.test(d)) return "Reparación";
  if (/mano de obra|hora|t[eé]cnico|labor|vi[aá]tico/i.test(d) || modelo === "repuestos-servicios") return "Mano de obra";
  return "Otro";
}
