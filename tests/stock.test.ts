import { describe, expect, it } from "vitest";
import { filasDeMovimiento, leerNumero, leerStockPegado } from "@/lib/stock";

describe("filasDeMovimiento", () => {
  const base = { articuloId: 7, depositoId: 1 };

  it("un ingreso suma y un egreso resta", () => {
    expect(filasDeMovimiento({ ...base, tipo: "ingreso", cantidad: 5 })).toEqual([
      { articulo_id: 7, deposito_id: 1, tipo: "ingreso", cantidad: 5, referencia: null, notas: null },
    ]);
    expect(filasDeMovimiento({ ...base, tipo: "egreso", cantidad: 2, actual: 5, referencia: "Cliente X" })).toEqual([
      { articulo_id: 7, deposito_id: 1, tipo: "egreso", cantidad: -2, referencia: "Cliente X", notas: null },
    ]);
  });

  it("no deja sacar más de lo que hay", () => {
    expect(filasDeMovimiento({ ...base, tipo: "egreso", cantidad: 6, actual: 5 })).toMatch(/hay 5/);
    expect(filasDeMovimiento({ ...base, tipo: "transferencia", destinoId: 2, cantidad: 6, actual: 5 })).toMatch(/hay 5/);
  });

  it("una transferencia sale de un depósito y entra en otro", () => {
    const filas = filasDeMovimiento({ ...base, tipo: "transferencia", destinoId: 2, cantidad: 3, actual: 5 });
    expect(filas).toEqual([
      expect.objectContaining({ deposito_id: 1, cantidad: -3, tipo: "transferencia" }),
      expect.objectContaining({ deposito_id: 2, cantidad: 3, tipo: "transferencia" }),
    ]);
    expect(filasDeMovimiento({ ...base, tipo: "transferencia", destinoId: 1, cantidad: 3, actual: 5 })).toMatch(/destino/);
  });

  it("un ajuste guarda la diferencia con lo contado", () => {
    expect(filasDeMovimiento({ ...base, tipo: "ajuste", cantidad: 3, actual: 5 })).toEqual([expect.objectContaining({ cantidad: -2 })]);
    expect(filasDeMovimiento({ ...base, tipo: "ajuste", cantidad: 8, actual: 5 })).toEqual([expect.objectContaining({ cantidad: 3 })]);
    expect(filasDeMovimiento({ ...base, tipo: "ajuste", cantidad: 5, actual: 5 })).toMatch(/misma/);
  });

  it("rechaza cantidades vacías o negativas", () => {
    expect(typeof filasDeMovimiento({ ...base, tipo: "ingreso", cantidad: NaN })).toBe("string");
    expect(typeof filasDeMovimiento({ ...base, tipo: "ingreso", cantidad: -1 })).toBe("string");
    expect(typeof filasDeMovimiento({ ...base, tipo: "ingreso", cantidad: 0 })).toBe("string");
  });
});

describe("leerNumero", () => {
  it("entiende el formato argentino y el inglés", () => {
    expect(leerNumero("1.234,50")).toBe(1234.5);
    expect(leerNumero("1,234.50")).toBe(1234.5);
    expect(leerNumero("12.5")).toBe(12.5);
    expect(leerNumero("1.500")).toBe(1500);
    expect(leerNumero("US$ 320")).toBe(320);
    expect(leerNumero("")).toBeNull();
  });
});

describe("leerStockPegado", () => {
  it("lee las columnas por los títulos, en cualquier orden", () => {
    const texto = "Descripción\tPart Number\tMarca\tCant.\tDepósito\tPrecio\tMoneda\nBearing main\t8455666\tElectro-Motive\t4\tZárate\t1.250,00\tusd";
    expect(leerStockPegado(texto)).toEqual({
      filas: [
        {
          pn: "8455666",
          marca: "EMD",
          descripcion: "Bearing main",
          cantidad: 4,
          deposito: "Zárate",
          ubicacion: null,
          condicion: null,
          costo: null,
          precio: 1250,
          moneda: "USD",
        },
      ],
    });
  });

  it("junta el mismo PN, marca y depósito y suma las cantidades", () => {
    const { filas } = leerStockPegado("PN\tMarca\tCantidad\n8N-7005\tCaterpillar\t2\n8n7005\tCAT\t3\n8N7005\tCAT\t1\n");
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ pn: "8N-7005", marca: "CAT", cantidad: 6 });
  });

  it("separa nuevo de usado", () => {
    const { filas } = leerStockPegado("PN;Cantidad;Estado\n123456;1;Nuevo\n123456;2;Usado");
    expect(filas.map((f) => f.condicion)).toEqual(["Nuevo original", "Usado"]);
  });

  it("avisa si falta la fila de títulos o la columna del PN", () => {
    expect(leerStockPegado("8455666\t4").error).toBeTruthy();
    expect(leerStockPegado("Cantidad\tMarca\n4\tEMD").error).toMatch(/PN/);
  });
});
