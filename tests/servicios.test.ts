import { describe, expect, it } from "vitest";
import { filtroPalabra, palabrasBusqueda, resumenPrecios, textoUnidad } from "@/lib/servicios";

describe("palabrasBusqueda", () => {
  it("separa por espacios y saca lo que rompe el filtro", () => {
    expect(palabrasBusqueda("overhaul  16-645, (culata)%")).toEqual(["overhaul", "16-645", "culata"]);
  });
  it("vacío sin texto", () => {
    expect(palabrasBusqueda(undefined)).toEqual([]);
    expect(palabrasBusqueda("  ")).toEqual([]);
  });
});

describe("filtroPalabra", () => {
  it("busca la palabra en todas las columnas", () => {
    const f = filtroPalabra("culata");
    expect(f).toContain("descripcion.ilike.%culata%");
    expect(f).toContain("proveedor_nombre.ilike.%culata%");
  });
});

describe("resumenPrecios", () => {
  it("agrupa por moneda y unidad con mínimo, máximo y el más reciente", () => {
    const r = resumenPrecios([
      { precio: 1000, moneda: "usd", fecha: "2025-03-01", unidad: "servicio" },
      { precio: 1500, moneda: "USD", fecha: "2026-01-10", unidad: null },
      { precio: 800, moneda: "USD", fecha: "2024-07-15", unidad: "global" },
      { precio: 45, moneda: "USD", fecha: "2026-02-20", unidad: "Hora" },
      { precio: 900000, moneda: "ARS", fecha: "2026-02-01", unidad: null },
      { precio: null, moneda: "USD", fecha: "2026-05-01", unidad: null },
    ]);
    expect(r).toEqual([
      { moneda: "USD", unidad: "", cantidad: 3, minimo: 800, maximo: 1500, ultimo: { precio: 1500, fecha: "2026-01-10" } },
      { moneda: "USD", unidad: "hora", cantidad: 1, minimo: 45, maximo: 45, ultimo: { precio: 45, fecha: "2026-02-20" } },
      { moneda: "ARS", unidad: "", cantidad: 1, minimo: 900000, maximo: 900000, ultimo: { precio: 900000, fecha: "2026-02-01" } },
    ]);
  });
  it("sin precios no devuelve nada", () => {
    expect(resumenPrecios([{ precio: null, moneda: "USD", fecha: null, unidad: null }])).toEqual([]);
  });
});

describe("textoUnidad", () => {
  it("solo aclara cuando el precio es por hora, día...", () => {
    expect(textoUnidad("hora")).toBe("por hora");
    expect(textoUnidad("global")).toBe("");
    expect(textoUnidad(null)).toBe("");
  });
});
