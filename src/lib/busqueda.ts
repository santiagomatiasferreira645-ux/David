import { normalizarPn } from "./pn";
import type { ConsultaPn, Contacto, Cotizacion, Proveedor } from "./tipos";

// Por qué aparece cada proveedor en el resultado, de más a menos útil.
export type Motivo = "cotizo_este_pn" | "consultado_por_este_pn" | "maneja_la_marca";

export const MOTIVO_TEXTO: Record<Motivo, string> = {
  cotizo_este_pn: "Cotizó este PN",
  consultado_por_este_pn: "Ya se le consultó este PN",
  maneja_la_marca: "Maneja la marca",
};

export type Resultado = {
  proveedor: Proveedor;
  motivo: Motivo;
  contactos: Contacto[];
  ultimaCotizacion: Cotizacion | null; // la más reciente del proveedor para este PN
  cotizaciones: Cotizacion[];
};

const ORDEN: Record<Motivo, number> = { cotizo_este_pn: 0, consultado_por_este_pn: 1, maneja_la_marca: 2 };

export function coincidePn(pnGuardado: string | null, buscado: string): boolean {
  if (!pnGuardado || !buscado) return false;
  return normalizarPn(pnGuardado).includes(buscado);
}

export function manejaMarca(marcas: string | null, marca: string): boolean {
  if (!marcas || !marca) return false;
  return marcas.toLowerCase().includes(marca.trim().toLowerCase());
}

// Contacto más útil primero: canal preferido definido, con WhatsApp, con teléfono, con email.
export function ordenarContactos(cs: Contacto[]): Contacto[] {
  const puntaje = (c: Contacto) =>
    (c.canal_preferido ? 8 : 0) + (c.tiene_whatsapp === "Sí" ? 4 : 0) + (c.telefono ? 2 : 0) + (c.email ? 1 : 0);
  return [...cs].sort((a, b) => puntaje(b) - puntaje(a));
}

export function armarResultados(args: {
  pn: string;
  marca: string;
  proveedores: Proveedor[];
  contactos: Contacto[];
  cotizaciones: Cotizacion[];
  consultas: ConsultaPn[];
}): Resultado[] {
  const buscado = normalizarPn(args.pn);
  const porId = new Map(args.proveedores.map((p) => [p.id, p]));
  const resultados = new Map<string, Resultado>();

  const agregar = (proveedorId: string | null, motivo: Motivo) => {
    if (!proveedorId) return null;
    const proveedor = porId.get(proveedorId);
    if (!proveedor) return null;
    const actual = resultados.get(proveedorId);
    if (actual) {
      if (ORDEN[motivo] < ORDEN[actual.motivo]) actual.motivo = motivo;
      return actual;
    }
    const nuevo: Resultado = {
      proveedor,
      motivo,
      contactos: ordenarContactos(args.contactos.filter((c) => c.proveedor_id === proveedorId)),
      ultimaCotizacion: null,
      cotizaciones: [],
    };
    resultados.set(proveedorId, nuevo);
    return nuevo;
  };

  for (const c of args.cotizaciones) {
    if (!coincidePn(c.pn, buscado) || c.tipo_precio !== "Cotización del proveedor") continue;
    const r = agregar(c.proveedor_id, "cotizo_este_pn");
    if (r) r.cotizaciones.push(c);
  }
  for (const c of args.consultas) {
    if (coincidePn(c.pn, buscado)) agregar(c.proveedor_id, "consultado_por_este_pn");
  }
  if (args.marca) {
    for (const p of args.proveedores) {
      if (manejaMarca(p.marcas, args.marca)) agregar(p.id, "maneja_la_marca");
    }
  }

  for (const r of resultados.values()) {
    r.cotizaciones.sort((a, b) => b.fecha.localeCompare(a.fecha));
    r.ultimaCotizacion = r.cotizaciones[0] ?? null;
  }

  return [...resultados.values()].sort((a, b) => {
    if (ORDEN[a.motivo] !== ORDEN[b.motivo]) return ORDEN[a.motivo] - ORDEN[b.motivo];
    const fa = a.ultimaCotizacion?.fecha ?? "";
    const fb = b.ultimaCotizacion?.fecha ?? "";
    if (fa !== fb) return fb.localeCompare(fa);
    return (b.proveedor.calificacion ?? 0) - (a.proveedor.calificacion ?? 0) || a.proveedor.empresa.localeCompare(b.proveedor.empresa);
  });
}
