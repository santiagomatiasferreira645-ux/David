import { describe, expect, it } from "vitest";
import { clientePorEmail, listaDominios, margenDe, precioSugerido } from "@/lib/clientes";
import type { PrecioCliente } from "@/lib/tipos";

const acordado: PrecioCliente = {
  id: 1, cliente_id: "C0001", pn: "8N7005", pn_normalizado: "8N7005", marca: "CAT", descripcion: null,
  precio: 120, moneda: "USD", vigente_hasta: "2026-12-31", notas: null,
};
const ventas = [
  { fecha: "2026-03-01", estado: "Vendido" as const, precio_unitario: 100, moneda: "USD", comprobante: "F-001" },
  { fecha: "2026-06-01", estado: "Presupuestado" as const, precio_unitario: 110, moneda: "USD", comprobante: null },
  { fecha: "2026-05-01", estado: "Vendido" as const, precio_unitario: 105, moneda: "USD", comprobante: "F-014" },
];

describe("precioSugerido", () => {
  it("usa primero el precio acordado vigente", () => {
    const s = precioSugerido({ acordado, ventas, hoy: "2026-11-09" })!;
    expect(s).toMatchObject({ precio: 120, fuente: "acordado" });
  });
  it("si el acordado venció, toma la última venta (no el presupuesto más nuevo)", () => {
    const s = precioSugerido({ acordado: { ...acordado, vigente_hasta: "2026-01-01" }, ventas, hoy: "2026-11-09" })!;
    expect(s).toMatchObject({ precio: 105, fuente: "ultima_venta" });
    expect(s.detalle).toContain("F-014");
  });
  it("sin ventas usa el último presupuesto", () => {
    const s = precioSugerido({ ventas: ventas.filter((v) => v.estado === "Presupuestado") })!;
    expect(s).toMatchObject({ precio: 110, fuente: "ultimo_presupuesto" });
  });
  it("sin historial aplica el margen del cliente sobre el costo", () => {
    const s = precioSugerido({ ventas: [], costo: { precio: 80, moneda: "USD", proveedor: "Hatch & Kirk" }, margenPct: 35 })!;
    expect(s).toMatchObject({ precio: 108, moneda: "USD", fuente: "margen" });
  });
  it("sin historial ni margen no sugiere nada", () => {
    expect(precioSugerido({ ventas: [], costo: { precio: 80, moneda: "USD" } })).toBeNull();
  });
});

describe("margenDe", () => {
  it("calcula el recargo sobre costo", () => {
    expect(margenDe(130, 100)).toBe(30);
    expect(margenDe(100, null)).toBeNull();
  });
});

describe("clientes por dominio de mail", () => {
  const clientes = [
    { id: "C0001", dominios: "hbsa.com.py, @hidrovias.com.br" },
    { id: "C0002", dominios: "lhgmining.com.br" },
  ];
  it("separa la lista de dominios", () => {
    expect(listaDominios(" hbsa.com.py, @Hidrovias.com.br;x.com ")).toEqual(["hbsa.com.py", "hidrovias.com.br", "x.com"]);
  });
  it("reconoce el cliente, también por subdominio", () => {
    expect(clientePorEmail("compras@hbsa.com.py", clientes)?.id).toBe("C0001");
    expect(clientePorEmail("x@py.lhgmining.com.br", clientes)?.id).toBe("C0002");
    expect(clientePorEmail("x@otro.com", clientes)).toBeNull();
    expect(clientePorEmail("x@mining.com.br", clientes)).toBeNull();
  });
});
