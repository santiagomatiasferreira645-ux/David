import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type RenglonListado = {
  pn: string;
  marca: string | null;
  descripcion: string | null;
  condicion: string;
  cantidad: number;
  precio: number | null;
  moneda: string | null;
};

export type SeccionListado = { deposito: string; ubicacion: string | null; renglones: RenglonListado[] };

export type OpcionesListado = {
  titulo: string;
  fecha: string; // ya formateada, ej. "25/11/2026"
  conPrecios: boolean;
  logo?: Uint8Array | null;
  empresa?: string;
};

// Las fuentes estándar del PDF solo tienen los caracteres de Windows-1252: el resto se reemplaza
// para que un texto raro (ej. "≥" o un carácter chino en una descripción) no rompa el archivo.
const WIN_ANSI = /[^\x20-\x7E\xA0-\xFFŒœŠšŸŽžƒˆ˜–—‘’‚“”„†‡•…‰‹›€™]/g;
export const textoPdf = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFC")
    .replace(/[\t\r\n]+/g, " ")
    .replace(/[≥]/g, ">=")
    .replace(/[≤]/g, "<=")
    .replace(WIN_ANSI, "?")
    .trim();

const formatoNumero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const formatoPrecio = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Corta el texto en renglones que entren en el ancho; una palabra más larga que el ancho se parte.
export function partirTexto(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  const mide = (s: string) => fuente.widthOfTextAtSize(s, tamano);
  for (let palabra of texto.split(/\s+/).filter(Boolean)) {
    while (mide(palabra) > ancho) {
      let i = palabra.length - 1;
      while (i > 1 && mide(palabra.slice(0, i)) > ancho) i--;
      if (actual) lineas.push(actual);
      lineas.push(palabra.slice(0, i));
      actual = "";
      palabra = palabra.slice(i);
    }
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (mide(prueba) <= ancho) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

const A4: [number, number] = [595.28, 841.89];
const MARGEN = 36;
const TINTA = rgb(0.1, 0.12, 0.16);
const GRIS = rgb(0.42, 0.46, 0.53);
const LINEA = rgb(0.85, 0.87, 0.9);
const FONDO_CABECERA = rgb(0.93, 0.95, 0.97);
const ACENTO = rgb(0.03, 0.57, 0.7);

// Listado de stock para mandar a clientes: una sección por depósito con PN, marca, descripción,
// condición, cantidad y, si se elige, el precio de referencia. Nunca lleva costos ni proveedores.
export async function generarListadoPdf(secciones: SeccionListado[], o: OpcionesListado): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(textoPdf(o.titulo));
  doc.setCreator("Buscador de repuestos");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoNegrita = await doc.embedFont(StandardFonts.CourierBold);
  let logo = null;
  if (o.logo) {
    try {
      logo = await doc.embedPng(o.logo);
    } catch {
      logo = null;
    }
  }

  const ancho = A4[0] - 2 * MARGEN;
  const cols = o.conPrecios
    ? { pn: 84, marca: 58, condicion: 86, cantidad: 36, precio: 80 }
    : { pn: 96, marca: 70, condicion: 88, cantidad: 44, precio: 0 };
  const anchoDesc = ancho - cols.pn - cols.marca - cols.condicion - cols.cantidad - cols.precio;
  const T = 8.5;
  const ALTO_LINEA = 11;

  let pagina!: PDFPage;
  let y = 0;

  const encabezadoPagina = () => {
    pagina = doc.addPage(A4);
    y = A4[1] - MARGEN;
    let x = MARGEN;
    if (logo) {
      const alto = 34;
      const w = (logo.width / logo.height) * alto;
      pagina.drawImage(logo, { x, y: y - alto, width: w, height: alto });
      x += w + 10;
    }
    pagina.drawText(textoPdf(o.titulo), { x, y: y - 14, size: 15, font: negrita, color: TINTA });
    pagina.drawText(textoPdf([o.empresa, `Stock al ${o.fecha}`].filter(Boolean).join(" · ")), { x, y: y - 28, size: 9, font: normal, color: GRIS });
    y -= 44;
    pagina.drawRectangle({ x: MARGEN, y, width: ancho, height: 1.2, color: ACENTO });
    y -= 14;
  };

  const cabeceraTabla = () => {
    pagina.drawRectangle({ x: MARGEN, y: y - 4, width: ancho, height: 15, color: FONDO_CABECERA });
    let x = MARGEN + 4;
    const titulos: [string, number, boolean?][] = [
      ["PN", cols.pn],
      ["Marca", cols.marca],
      ["Descripción", anchoDesc],
      ["Condición", cols.condicion],
      ["Cant.", cols.cantidad, true],
      ...(o.conPrecios ? ([["Precio unit.", cols.precio, true]] as [string, number, boolean][]) : []),
    ];
    for (const [t, w, derecha] of titulos) {
      const texto = textoPdf(t).toUpperCase();
      const tx = derecha ? x + w - 8 - negrita.widthOfTextAtSize(texto, 7.5) : x;
      pagina.drawText(texto, { x: tx, y, size: 7.5, font: negrita, color: GRIS });
      x += w;
    }
    y -= 16;
  };

  const espacio = (alto: number, conCabecera: boolean) => {
    if (y - alto < MARGEN + 24) {
      encabezadoPagina();
      if (conCabecera) cabeceraTabla();
    }
  };

  encabezadoPagina();
  const secs = secciones.filter((s) => s.renglones.length);
  if (!secs.length) pagina.drawText("No hay artículos con existencia para listar.", { x: MARGEN, y, size: 10, font: normal, color: GRIS });

  for (const s of secs) {
    espacio(60, false);
    const total = s.renglones.reduce((n, r) => n + r.cantidad, 0);
    pagina.drawText(textoPdf(s.deposito), { x: MARGEN, y, size: 11.5, font: negrita, color: TINTA });
    const detalle = textoPdf([s.ubicacion, `${s.renglones.length} artículos · ${formatoNumero(total)} unidades`].filter(Boolean).join(" · "));
    pagina.drawText(detalle, { x: MARGEN + negrita.widthOfTextAtSize(textoPdf(s.deposito), 11.5) + 8, y: y + 0.5, size: 8.5, font: normal, color: GRIS });
    y -= 18;
    cabeceraTabla();

    for (const r of s.renglones) {
      const pn = partirTexto(textoPdf(r.pn), monoNegrita, T, cols.pn - 8);
      const marca = partirTexto(textoPdf(r.marca), normal, T, cols.marca - 8);
      const desc = partirTexto(textoPdf(r.descripcion), normal, T, anchoDesc - 8);
      const cond = partirTexto(textoPdf(r.condicion), normal, T, cols.condicion - 8);
      const lineas = Math.max(pn.length, marca.length, desc.length, cond.length);
      const alto = lineas * ALTO_LINEA + 5;
      espacio(alto, true);

      let x = MARGEN + 4;
      const columna = (texto: string[], w: number, fuente: PDFFont, color = TINTA) => {
        texto.forEach((l, i) => pagina.drawText(l, { x, y: y - i * ALTO_LINEA, size: T, font: fuente, color }));
        x += w;
      };
      const derecha = (texto: string, w: number, fuente: PDFFont) => {
        pagina.drawText(texto, { x: x + w - 8 - fuente.widthOfTextAtSize(texto, T), y, size: T, font: fuente, color: TINTA });
        x += w;
      };
      columna(pn, cols.pn, monoNegrita);
      columna(marca, cols.marca, normal);
      columna(desc, anchoDesc, normal);
      columna(cond, cols.condicion, normal, GRIS);
      derecha(formatoNumero(r.cantidad), cols.cantidad, mono);
      if (o.conPrecios) derecha(r.precio != null ? textoPdf(`${formatoPrecio(r.precio)} ${r.moneda ?? ""}`.trim()) : "Consultar", cols.precio, mono);

      y -= alto - 4;
      pagina.drawRectangle({ x: MARGEN, y: y + 2, width: ancho, height: 0.5, color: LINEA });
      y -= 7;
    }
    y -= 10;
  }

  // Pie en todas las páginas: aclaración y número de página.
  const paginas = doc.getPages();
  const aclaracion = o.conPrecios
    ? "Precios unitarios de referencia, sujetos a confirmación y a disponibilidad al momento del pedido."
    : "Cantidades sujetas a disponibilidad al momento del pedido. Precios a consultar.";
  paginas.forEach((p, i) => {
    p.drawText(aclaracion, { x: MARGEN, y: MARGEN - 12, size: 7.5, font: normal, color: GRIS });
    const num = `${i + 1} / ${paginas.length}`;
    p.drawText(num, { x: A4[0] - MARGEN - normal.widthOfTextAtSize(num, 7.5), y: MARGEN - 12, size: 7.5, font: normal, color: GRIS });
  });
  return doc.save();
}
