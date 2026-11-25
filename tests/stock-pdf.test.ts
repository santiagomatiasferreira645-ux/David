import { readFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { generarListadoPdf, partirTexto, textoPdf } from "@/lib/stock-pdf";

describe("textoPdf", () => {
  it("deja acentos y eñes y cambia lo que la fuente no tiene", () => {
    expect(textoPdf("Válvula de admisión ñ")).toBe("Válvula de admisión ñ");
    expect(textoPdf("≥ 5 mm 轴承")).toBe(">= 5 mm ??");
    expect(textoPdf("línea\tuno\ndos")).toBe("línea uno dos");
  });
});

describe("partirTexto", () => {
  it("corta por palabras y parte las que no entran", async () => {
    const fuente = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    const lineas = partirTexto("Bearing main lower half standard size 8 cylinder", fuente, 8.5, 80);
    expect(lineas.length).toBeGreaterThan(1);
    lineas.forEach((l) => expect(fuente.widthOfTextAtSize(l, 8.5)).toBeLessThanOrEqual(80));
    expect(partirTexto("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", fuente, 8.5, 40).every((l) => fuente.widthOfTextAtSize(l, 8.5) <= 40)).toBe(true);
  });
});

describe("generarListadoPdf", () => {
  it("arma varias páginas con una sección por depósito", async () => {
    const renglones = Array.from({ length: 80 }, (_, i) => ({
      pn: `84556${String(i).padStart(2, "0")}`,
      marca: i % 2 ? "EMD" : "CAT",
      descripcion: i % 5 ? "Bearing main" : "Cojinete de bancada inferior, medida estándar, para motor de 16 cilindros 645E3",
      condicion: i % 3 ? "Nuevo original" : "Reacondicionado",
      cantidad: i + 1,
      precio: i % 4 ? 1250.5 : null,
      moneda: "USD",
    }));
    const pdf = await generarListadoPdf(
      [
        { deposito: "Galpón Zárate", ubicacion: "Zárate, Buenos Aires", renglones },
        { deposito: "Vacío", ubicacion: null, renglones: [] },
        { deposito: "Taller Asunción", ubicacion: null, renglones: renglones.slice(0, 5) },
      ],
      { titulo: "Stock disponible", fecha: "25/11/2026", conPrecios: true, logo: readFileSync("public/logos/daysa.png"), empresa: "DAYSA" },
    );
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    if (process.env.GUARDAR_PDF) (await import("node:fs")).writeFileSync(process.env.GUARDAR_PDF, pdf);
  });

  it("sin artículos igual genera una página", async () => {
    const doc = await PDFDocument.load(await generarListadoPdf([], { titulo: "Stock", fecha: "1/1/2026", conPrecios: false }));
    expect(doc.getPageCount()).toBe(1);
  });
});
