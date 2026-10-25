import { describe, expect, it } from "vitest";
import { leerListaPn } from "@/lib/lista-pn";

describe("leerListaPn", () => {
  it("toma una lista simple, una por línea o separada por comas", () => {
    expect(leerListaPn("8455666\n8N-7005, 3077541").map((i) => i.pn)).toEqual(["8455666", "8N-7005", "3077541"]);
  });

  it("reconoce las columnas por la cabecera", () => {
    const texto = "Item\tDescripción\tPart Number\tCant.\n1\tBearing main\t8455666\t4\n2\tGasket\t8N-7005\t10";
    expect(leerListaPn(texto)).toEqual([
      { pn: "8455666", cantidad: 4, descripcion: "Bearing main" },
      { pn: "8N-7005", cantidad: 10, descripcion: "Gasket" },
    ]);
  });

  it("sin cabecera distingue el PN numérico de la cantidad y del número de renglón", () => {
    const texto = "1\t8455666\t2\tBearing main lower\n2\t40001234\t6\tPiston ring set\n3\t9548417\t1\tSeal oil pump";
    expect(leerListaPn(texto)).toEqual([
      { pn: "8455666", cantidad: 2, descripcion: "Bearing main lower" },
      { pn: "40001234", cantidad: 6, descripcion: "Piston ring set" },
      { pn: "9548417", cantidad: 1, descripcion: "Seal oil pump" },
    ]);
  });

  it("junta el mismo PN escrito distinto y suma las cantidades", () => {
    expect(leerListaPn("PN\tQty\n8N-7005\t2\n8n7005\t3")).toEqual([{ pn: "8N-7005", cantidad: 5, descripcion: "" }]);
  });

  it("saltea renglones vacíos o sin PN", () => {
    expect(leerListaPn("PN\tQty\n8455666\t1\n\t\nTOTAL\t1").map((i) => i.pn)).toEqual(["8455666"]);
  });
});
