import { describe, expect, it } from "vitest";
import {
  aNumero,
  categoriaServicio,
  condiciones,
  fechaLarga,
  leerPegado,
  nombreArchivo,
  nuevoPresupuesto,
  numeroSiguiente,
  totales,
  validar,
  valorizado,
} from "@/lib/presupuesto-emitido";
import { generarPresupuestoPdf } from "@/lib/presupuesto-emitido-pdf";

// Renglones del presupuesto 26133/26 de DAYSA: el total es la suma del valorizado, no de los precios unitarios.
const daysa = [
  { pn: "2.2108 BB", descripcion: "Junta", cantidad: 12, precio: 417.2 },
  { pn: "2.1110-038", descripcion: "Junta tórica", cantidad: 12, precio: 42 },
  { pn: "2.1110-041", descripcion: "Junta tórica", cantidad: 12, precio: 11.2 },
  { pn: "2.8320-003", descripcion: "Cooling water distributing pipe", cantidad: 12, precio: 8.96 },
  { pn: "2.1110-113", descripcion: "Anti-polishing ring", cantidad: 12, precio: 420 },
  { pn: "2.2151-005C", descripcion: "Anillo", cantidad: 24, precio: 252 },
  { pn: "2.2151-004D", descripcion: "Anillo", cantidad: 24, precio: 70 },
];

describe("emitir presupuesto", () => {
  it("valoriza cantidad × precio y suma el valorizado", () => {
    expect(valorizado({ cantidad: 12, precio: 417.2 })).toBe(5006.4);
    expect(valorizado({ cantidad: null, precio: 10 })).toBeNull();
    expect(totales({ modelo: "repuestos", renglones: daysa, detalles: [] }).total).toBe(18520.32);
  });

  it("suma solo lo que muestra cada modelo", () => {
    const detalles = [{ descripcion: "Mano de obra", precio: 2800 }, { descripcion: "Traslado", precio: 350 }];
    expect(totales({ modelo: "repuestos", renglones: daysa, detalles })).toEqual({ repuestos: 18520.32, servicios: 0, total: 18520.32 });
    expect(totales({ modelo: "repuestos-servicios", renglones: daysa, detalles }).total).toBe(21670.32);
    expect(totales({ modelo: "servicios", renglones: daysa, detalles }).total).toBe(3150);
  });

  it("sugiere el número siguiente con el año, en el formato de cada empresa", () => {
    const hoy = new Date("2026-11-26T12:00:00");
    expect(numeroSiguiente(["26133/26", "26131/26"], "daysa", hoy)).toBe("26134/26");
    expect(numeroSiguiente(["1301-26"], "tecnica-naval", hoy)).toBe("1302-26");
    expect(numeroSiguiente([], "daysa", hoy)).toBe("");
  });

  it("lee números escritos a mano", () => {
    expect(aNumero("417,20")).toBe(417.2);
    expect(aNumero("1.234,56")).toBe(1234.56);
    expect(aNumero("1,234.56")).toBe(1234.56);
    expect(aNumero("8.96")).toBe(8.96);
    expect(aNumero("6.850")).toBe(6850);
    expect(aNumero("USD 70")).toBe(70);
    expect(aNumero("")).toBeNull();
  });

  it("reparte filas pegadas desde Excel", () => {
    expect(leerPegado("2.2108 BB\tJunta\t12\t417,20\t5.006,40\n2.1110-038\tJunta tórica\t12\t42")).toEqual([
      { pn: "2.2108 BB", descripcion: "Junta", cantidad: 12, precio: 417.2 },
      { pn: "2.1110-038", descripcion: "Junta tórica", cantidad: 12, precio: 42 },
    ]);
    expect(leerPegado("1\t8125412\tJunta\t16\t38,5")).toEqual([{ pn: "8125412", descripcion: "Junta", cantidad: 16, precio: 38.5 }]);
    expect(leerPegado("8125412\t16\t38,5")).toEqual([{ pn: "8125412", descripcion: "", cantidad: 16, precio: 38.5 }]);
  });

  it("arma fecha, condiciones y nombre de archivo", () => {
    expect(fechaLarga("2026-10-16", "Asunción")).toBe("Asunción, 16 de octubre de 2026");
    const c = condiciones({ entrega_dias: 30, plazo_pago: "45 días", oferta_dias: 15, aclaraciones: "", lugar_entrega: "Depósito" });
    expect(c.map(([k]) => k)).toEqual(["Tiempo de entrega", "Plazo de pago", "Mantenimiento de oferta", "Aclaraciones", "Lugar de entrega"]);
    expect(c[0][1]).toBe("30 días");
    expect(nombreArchivo({ membrete: "tecnica-naval", numero: "1301-25", cliente: "Cargill" })).toBe("presupuesto_tecnica-naval-y-servicios_1301-25_cargill.pdf");
  });

  it("valida lo mínimo y descarta renglones vacíos", () => {
    const p = { ...nuevoPresupuesto("daysa", "repuestos"), cliente: "LHG" };
    expect(validar(p)).toEqual({ ok: false, error: "Cargá al menos un renglón en la tabla." });
    const v = validar({ ...p, renglones: [...daysa, { pn: "", descripcion: " ", cantidad: 1, precio: null }] });
    expect(v.ok && v.datos.renglones).toHaveLength(7);
    expect(validar({ ...p, modelo: "servicios" })).toEqual({ ok: false, error: "Escribí el detalle del servicio." });
    expect(validar({ ...p, cliente: " " })).toEqual({ ok: false, error: "Falta el cliente." });
  });

  it("clasifica los servicios", () => {
    expect(categoriaServicio("Flete a bordo", "repuestos-servicios")).toBe("Flete / logística");
    expect(categoriaServicio("Cambio de conjuntos de potencia", "repuestos-servicios")).toBe("Mano de obra");
    expect(categoriaServicio("Cambio de conjuntos de potencia", "servicios")).toBe("Otro");
  });

  it("genera el PDF de los tres modelos, aunque ocupe más de una hoja", async () => {
    const base = { ...nuevoPresupuesto("tecnica-naval", "repuestos-servicios"), cliente: "Cargill", numero: "1301-25", fecha: "2025-10-14" };
    const muchos = Array.from({ length: 40 }, (_, i) => ({ ...daysa[i % 7], pn: `PN-${i}` }));
    for (const modelo of ["repuestos", "repuestos-servicios", "servicios"] as const) {
      const pdf = await generarPresupuestoPdf({ ...base, modelo, renglones: muchos, detalles: [{ descripcion: "Mano de obra\ncon prueba", precio: 0 }] });
      expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    }
  });
});
