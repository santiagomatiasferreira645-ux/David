import { describe, expect, it } from "vitest";
import { armarResultados } from "@/lib/busqueda";
import type { ConsultaPn, Contacto, Cotizacion, Proveedor } from "@/lib/tipos";

const prov = (id: string, empresa: string, marcas: string, calificacion: number | null = null): Proveedor => ({
  id, empresa, marcas, calificacion, pais: null, ciudad: null, zona_horaria: null, idioma: null, tipo: null, web: null, origen: null, productos: null, notas: null,
});
const cot = (id: number, proveedor_id: string, pn: string, fecha: string, tipo_precio = "Cotización del proveedor"): Cotizacion => ({
  id, proveedor_id, pn, fecha, tipo_precio, busqueda_id: null, pn_normalizado: null, marca: null, descripcion: null, modelo_motor: null, cantidad: 1,
  precio_unitario: 100, moneda: "USD", incoterm: null, plazo_dias: null, condicion: null, notas: null,
});
const contacto = (id: number, proveedor_id: string, extra: Partial<Contacto> = {}): Contacto => ({
  id, proveedor_id, nombre: `C${id}`, cargo: null, email: null, telefono: null, tiene_whatsapp: "No sé", canal_preferido: null, wechat: null, notas: null, ...extra,
});

const proveedores = [prov("P1", "Alfa", "CAT"), prov("P2", "Beta", "EMD"), prov("P3", "Gamma", "CAT, Detroit", 5), prov("P4", "Delta", "CAT")];
const consultas: ConsultaPn[] = [{ id: 1, proveedor_id: "P2", fecha: null, pn: "8N 7005", pn_normalizado: "8N7005", marca: null, descripcion: null }];

describe("armarResultados", () => {
  it("ordena: cotizó el PN, después consultado, después maneja la marca", () => {
    const r = armarResultados({
      pn: "8n-7005",
      marca: "cat",
      proveedores,
      contactos: [],
      cotizaciones: [cot(1, "P1", "8N-7005", "2025-01-10"), cot(2, "P4", "8N7005", "2026-03-01")],
      consultas,
    });
    expect(r.map((x) => [x.proveedor.id, x.motivo])).toEqual([
      ["P4", "cotizo_este_pn"],
      ["P1", "cotizo_este_pn"],
      ["P2", "consultado_por_este_pn"],
      ["P3", "maneja_la_marca"],
    ]);
    expect(r[0].ultimaCotizacion?.fecha).toBe("2026-03-01");
  });

  it("ignora referencias de mercado y fletes como precio del proveedor", () => {
    const r = armarResultados({ pn: "8N7005", marca: "", proveedores, contactos: [], cotizaciones: [cot(1, "P1", "8N7005", "2025-01-10", "Referencia de mercado")], consultas: [] });
    expect(r).toEqual([]);
  });

  it("pone primero el contacto con canal preferido y WhatsApp", () => {
    const r = armarResultados({
      pn: "X",
      marca: "EMD",
      proveedores,
      contactos: [contacto(1, "P2", { email: "a@b.com" }), contacto(2, "P2", { telefono: "+1", tiene_whatsapp: "Sí", canal_preferido: "WhatsApp" })],
      cotizaciones: [],
      consultas: [],
    });
    expect(r[0].contactos.map((c) => c.id)).toEqual([2, 1]);
  });
});
