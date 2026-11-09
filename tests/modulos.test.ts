import { describe, expect, it } from "vitest";
import { buscarAcciones, MODULOS, moduloDeRuta, moduloPorId, seccionActiva } from "../src/lib/modulos";

describe("módulos", () => {
  it("cada ruta pertenece a su módulo", () => {
    expect(moduloDeRuta("/buscar")?.id).toBe("repuestos");
    expect(moduloDeRuta("/catalogo/ver")?.id).toBe("repuestos");
    expect(moduloDeRuta("/proveedores/12")?.id).toBe("proveedores");
    expect(moduloDeRuta("/")).toBeNull();
    expect(moduloDeRuta("/cuenta")).toBeNull();
    expect(moduloDeRuta("/buscarx")).toBeNull();
  });

  it("marca la sección más específica", () => {
    const rep = MODULOS.find((m) => m.id === "repuestos")!;
    expect(seccionActiva(rep, "/buscar/multiple")).toBe("/buscar/multiple");
    expect(seccionActiva(rep, "/buscar")).toBe("/buscar");
    const prov = MODULOS.find((m) => m.id === "proveedores")!;
    expect(seccionActiva(prov, "/proveedores/5")).toBe("/proveedores");
  });

  it("no ofrece módulos que todavía no están", () => {
    const proximo = MODULOS.find((m) => !m.disponible);
    if (proximo) expect(moduloPorId(proximo.id)).toBeNull();
    expect(moduloPorId("proveedores")?.nombre).toBe("Proveedores");
  });

  it("encuentra atajos sin importar tildes", () => {
    expect(buscarAcciones("catalogo").map((a) => a.accion.href)).toContain("/catalogo");
    expect(buscarAcciones("proveedor nuevo").map((a) => a.accion.href)).toEqual(["/proveedores/nuevo"]);
    expect(buscarAcciones("")).toEqual([]);
  });

  it("los ids y rutas no se repiten", () => {
    expect(new Set(MODULOS.map((m) => m.id)).size).toBe(MODULOS.length);
    const prefijos = MODULOS.flatMap((m) => m.prefijos);
    expect(new Set(prefijos).size).toBe(prefijos.length);
  });
});

describe("atajos por tema", () => {
  it("'precio' no trae todo el módulo", () => {
    expect(buscarAcciones("precio").map((a) => a.accion.href)).toEqual(["/cotizaciones/nueva"]);
  });
});
