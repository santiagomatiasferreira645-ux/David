import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { Resultado } from "@/lib/busqueda";
import { generarExcel } from "@/lib/excel";

describe("generarExcel", () => {
  it("genera una fila por proveedor con links de WhatsApp, llamada y mail", async () => {
    const resultados: Resultado[] = [
      {
        motivo: "cotizo_este_pn",
        proveedor: { id: "P1", empresa: "Alfa", pais: "USA", ciudad: null, zona_horaria: "America/Chicago", idioma: null, marcas: "CAT", tipo: null, web: null, calificacion: null, origen: null, productos: null, notas: null },
        contactos: [{ id: 1, proveedor_id: "P1", nombre: "John Smith", cargo: null, email: "parts@alfa.com", telefono: "+17135550100", tiene_whatsapp: "No sé", canal_preferido: "Llamada", wechat: null, notas: null }],
        ultimaCotizacion: null,
        cotizaciones: [],
      },
    ];
    const buf = await generarExcel({ pn: "8N7005", marca: "CAT", cantidad: 2, resultados, ahora: new Date("2026-07-15T15:00:00Z") });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet("Resultados")!;
    expect(ws.rowCount).toBe(2);
    const fila = ws.getRow(2);
    expect(fila.getCell(3).value).toBe("Alfa");
    expect((fila.getCell(13).value as { hyperlink: string }).hyperlink).toMatch(/^https:\/\/wa\.me\/17135550100\?text=Hello%20John/);
    expect((fila.getCell(14).value as { hyperlink: string }).hyperlink).toBe("tel:+17135550100");
    expect((fila.getCell(15).value as { hyperlink: string }).hyperlink).toMatch(/^mailto:parts@alfa\.com\?subject=RFQ/);
    expect(fila.getCell(16).value).toBe("10:00 (abierto)");
  });
});
