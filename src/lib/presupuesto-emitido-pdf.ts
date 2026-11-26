import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import {
  condiciones,
  fechaLarga,
  formatoCantidad,
  LEYENDA_IVA,
  llevaDetalle,
  llevaTabla,
  MEMBRETES,
  precioUsd,
  tituloDetalle,
  totales,
  valorizado,
  type PresupuestoEmitido,
} from "./presupuesto-emitido";
import { partirTexto, textoPdf } from "./stock-pdf";

export type LogosMembrete = { principal?: Uint8Array | null; secundario?: Uint8Array | null };

const A4: [number, number] = [595.28, 841.89];
const MM = 2.8346;
const X0 = 20 * MM;
const ANCHO = A4[0] - 2 * X0;
const TOPE = A4[1] - 44 * MM; // donde empieza el cuerpo, debajo del encabezado
const PISO = 32 * MM; // hasta donde llega el cuerpo, arriba del pie

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const TINTA = hex("#1c2230");
const BLANCO = rgb(1, 1, 1);
const LINEA = hex("#dde2ea");
const ZEBRA = hex("#f6f8fb");

const PALETAS = {
  daysa: { oscuro: hex("#1f4e8c"), acento: hex("#2f6fb7"), suave: hex("#eef5fc"), gris: hex("#667085"), claro: hex("#9ccbf0") },
  "tecnica-naval": { oscuro: hex("#14295c"), acento: hex("#0a8fd0"), suave: hex("#edf6fc"), gris: hex("#5f6b7d"), claro: hex("#0a8fd0") },
};

// Párrafos de un texto con renglones (los Enter del cuadro de texto se respetan).
const parrafos = (s: string) => s.split(/\r?\n/).map((l) => textoPdf(l));

// Presupuesto con membrete de DAYSA o Técnica Naval, con la tabla de repuestos, el cuadro de detalle o los dos según
// el modelo, las condiciones de la oferta y la firma de cada empresa. Si no entra en una hoja, sigue en otra con el
// mismo membrete y vuelve a poner el encabezado de la tabla.
export async function generarPresupuestoPdf(p: PresupuestoEmitido, logos: LogosMembrete = {}): Promise<Uint8Array> {
  const m = MEMBRETES[p.membrete];
  const c = PALETAS[p.membrete];
  const doc = await PDFDocument.create();
  doc.setTitle(textoPdf(`Presupuesto ${p.numero ? `N° ${p.numero} ` : ""}- ${p.cliente}`));
  doc.setAuthor(textoPdf(m.razonSocial));
  doc.setCreator("Buscador de repuestos");
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const imagen = async (b?: Uint8Array | null): Promise<PDFImage | null> => {
    if (!b) return null;
    try {
      return b[0] === 0x89 ? await doc.embedPng(b) : await doc.embedJpg(b);
    } catch {
      return null;
    }
  };
  const logo1 = await imagen(logos.principal);
  const logo2 = await imagen(logos.secundario);

  let pagina!: PDFPage;
  let y = 0;

  // Texto con separación entre letras (los rótulos en mayúscula).
  const espaciado = (t: string, f: PDFFont, tam: number, sep: number) => f.widthOfTextAtSize(t, tam) + sep * Math.max(0, t.length - 1);
  const dibujarEspaciado = (t: string, x: number, yy: number, f: PDFFont, tam: number, sep: number, color: RGB) => {
    for (const ch of t) {
      pagina.drawText(ch, { x, y: yy, size: tam, font: f, color });
      x += f.widthOfTextAtSize(ch, tam) + sep;
    }
  };
  const derecha = (t: string, xDer: number, yy: number, f: PDFFont, tam: number, color: RGB) =>
    pagina.drawText(t, { x: xDer - f.widthOfTextAtSize(t, tam), y: yy, size: tam, font: f, color });
  const rotulo = (t: string, x: number, yy: number, color: RGB, alDer = false) => {
    const s = textoPdf(t).toUpperCase();
    dibujarEspaciado(s, alDer ? x - espaciado(s, negrita, 7.2, 0.9) : x, yy, negrita, 7.2, 0.9, color);
  };
  const dibujarLogo = (img: PDFImage | null, x: number, arriba: number, alto: number, alDer = false) => {
    if (!img) return;
    const w = (img.width / img.height) * alto;
    pagina.drawImage(img, { x: alDer ? x - w : x, y: arriba - alto, width: w, height: alto });
  };

  const membreteDaysa = () => {
    const [W, H] = A4;
    // Franja superior en degradé, del azul del logo al celeste.
    const pasos = 60;
    for (let i = 0; i < pasos; i++) {
      const t = i / (pasos - 1);
      const col = rgb(0.12 + t * (0.61 - 0.12), 0.31 + t * (0.8 - 0.31), 0.55 + t * (0.94 - 0.55));
      pagina.drawRectangle({ x: (W / pasos) * i, y: H - 3 * MM, width: W / pasos + 0.5, height: 3 * MM, color: col });
    }
    dibujarLogo(logo1, X0, H - 8 * MM, 24 * MM);
    derecha(textoPdf(m.razonSocial), X0 + ANCHO, H - 16 * MM, negrita, 15, c.oscuro);
    derecha("RUC 8433172-0 · Repuestos y servicios para motores marinos e industriales", X0 + ANCHO, H - 21 * MM, normal, 8.2, c.gris);
    pagina.drawRectangle({ x: X0, y: H - 35 * MM, width: ANCHO, height: 0.4 * MM, color: hex("#cfe1f4") });
    // Pie azul con los datos de contacto.
    pagina.drawRectangle({ x: 0, y: 0, width: W, height: 18 * MM, color: c.oscuro });
    pagina.drawRectangle({ x: 0, y: 18 * MM, width: W, height: 1.2 * MM, color: c.claro });
    const partes: [string, PDFFont, number][] = [
      ["DAYSA", negrita, 9],
      ["+595 971 598 512", normal, 8.2],
      ["davidf@daysa.com.py", normal, 8.2],
      ["Insp. Romero 186 esq. Salim Yubi · Luque", normal, 8.2],
    ];
    const hueco = 14;
    const total = partes.reduce((s, [t, f, tam]) => s + f.widthOfTextAtSize(textoPdf(t), tam), 0) + hueco * (partes.length - 1);
    let x = (W - total) / 2;
    partes.forEach(([t, f, tam], i) => {
      pagina.drawText(textoPdf(t), { x, y: 9 * MM - 3, size: tam, font: f, color: BLANCO });
      x += f.widthOfTextAtSize(textoPdf(t), tam);
      if (i < partes.length - 1) {
        pagina.drawCircle({ x: x + hueco / 2, y: 9 * MM, size: 1.3, color: c.claro });
        x += hueco;
      }
    });
  };

  const membreteNaval = () => {
    const [W, H] = A4;
    dibujarLogo(logo1, X0, H - 9 * MM, 17 * MM);
    dibujarLogo(logo2, X0 + ANCHO, H - 6 * MM, 25 * MM, true);
    const titulo = textoPdf("TÉCNICA NAVAL Y SERVICIOS");
    const wt = espaciado(titulo, negrita, 15, 0.8);
    dibujarEspaciado(titulo, (W - wt) / 2, H - 19 * MM, negrita, 15, 0.8, c.oscuro);
    const sub = textoPdf("MOTORES EMD · TALLER Y SERVICIO NAVAL");
    const ws = espaciado(sub, normal, 7.4, 1.6);
    dibujarEspaciado(sub, (W - ws) / 2, H - 24 * MM, normal, 7.4, 1.6, c.acento);
    pagina.drawRectangle({ x: X0, y: H - 35 * MM, width: ANCHO * 0.7, height: 1 * MM, color: c.oscuro });
    pagina.drawRectangle({ x: X0 + ANCHO * 0.7, y: H - 35 * MM, width: ANCHO * 0.3, height: 1 * MM, color: c.acento });
    // Pie: línea y tres columnas con dirección, teléfono y correos.
    pagina.drawRectangle({ x: X0, y: 20 * MM, width: ANCHO, height: 0.4 * MM, color: c.oscuro });
    const cols: [string, string[], "izq" | "centro" | "der"][] = [
      ["Office y taller", ["Gral. Díaz 983 · Asunción"], "izq"],
      ["Teléfono", ["+595 992 209 562"], "centro"],
      ["Correo", ["rconigliotecnicanaval@gmail.com", "serviciosnavalesEMD@gmail.com"], "der"],
    ];
    for (const [rot, lineas, lado] of cols) {
      const anchoCol = Math.max(espaciado(textoPdf(rot).toUpperCase(), negrita, 7.2, 0.9), ...lineas.map((l) => normal.widthOfTextAtSize(textoPdf(l), 8)));
      const x = lado === "izq" ? X0 : lado === "der" ? X0 + ANCHO - anchoCol : X0 + ANCHO * 0.42;
      rotulo(rot, x, 16 * MM, c.acento);
      lineas.forEach((l, i) => pagina.drawText(textoPdf(l), { x, y: 12.4 * MM - i * 10, size: 8, font: normal, color: c.oscuro }));
    }
  };

  const nuevaPagina = () => {
    pagina = doc.addPage(A4);
    if (p.membrete === "daysa") membreteDaysa();
    else membreteNaval();
    y = TOPE;
  };
  const lugar = (alto: number) => {
    if (y - alto < PISO) {
      nuevaPagina();
      return true;
    }
    return false;
  };

  nuevaPagina();

  // Destinatario a la izquierda; número y fecha a la derecha.
  rotulo("Señores", X0, y, c.gris);
  rotulo("Presupuesto", X0 + ANCHO, y, c.gris, true);
  const cliente = partirTexto(textoPdf(p.cliente), negrita, 12.5, ANCHO * 0.58);
  cliente.forEach((l, i) => pagina.drawText(l, { x: X0, y: y - 16 - i * 15, size: 12.5, font: negrita, color: TINTA }));
  let yIzq = y - 16 - (cliente.length - 1) * 15;
  if (p.atencion) {
    const at = partirTexto(textoPdf(/^at\b/i.test(p.atencion) ? p.atencion : `At. ${p.atencion}`), normal, 9.6, ANCHO * 0.58);
    at.forEach((l, i) => pagina.drawText(l, { x: X0, y: yIzq - 14 - i * 12, size: 9.6, font: normal, color: TINTA }));
    yIzq -= 14 + (at.length - 1) * 12;
  }
  if (p.numero) derecha(textoPdf(`N° ${p.numero}`), X0 + ANCHO, y - 17, negrita, 13, c.acento);
  derecha(textoPdf(fechaLarga(p.fecha, p.lugar)), X0 + ANCHO, y - 31, normal, 9.6, c.gris);
  y = Math.min(yIzq, y - 31) - 20;

  // Referencia: el título del presupuesto con la barra de color a la izquierda.
  if (p.referencia || p.referencia_detalle) {
    const t1 = p.referencia ? partirTexto(textoPdf(p.referencia), negrita, 10.2, ANCHO - 26) : [];
    const t2 = p.referencia_detalle ? partirTexto(textoPdf(p.referencia_detalle), normal, 8.4, ANCHO - 26) : [];
    const alto = 16 + t1.length * 13 + t2.length * 11;
    pagina.drawRectangle({ x: X0, y: y - alto, width: ANCHO, height: alto, color: c.suave });
    pagina.drawRectangle({ x: X0, y: y - alto, width: 1.2 * MM, height: alto, color: c.acento });
    let yy = y - 8 - 10;
    t1.forEach((l) => {
      pagina.drawText(l, { x: X0 + 14, y: yy, size: 10.2, font: negrita, color: TINTA });
      yy -= 13;
    });
    t2.forEach((l) => {
      pagina.drawText(l, { x: X0 + 14, y: yy + 1, size: 8.4, font: normal, color: c.gris });
      yy -= 11;
    });
    y -= alto + 14;
  }

  const t = totales(p);
  const cajaTotal = (rot: string, valor: number, xDer: number) => {
    const txt = precioUsd(valor);
    const w = negrita.widthOfTextAtSize(txt, 10.5) + 16;
    pagina.drawRectangle({ x: xDer - w, y: y - 20, width: w, height: 20, color: c.oscuro });
    derecha(txt, xDer - 8, y - 14, negrita, 10.5, BLANCO);
    const r = textoPdf(rot).toUpperCase();
    dibujarEspaciado(r, xDer - w - 10 - espaciado(r, negrita, 7.6, 0.6), y - 13, negrita, 7.6, 0.6, c.gris);
    y -= 20;
  };

  // Tabla de repuestos: Ítem, PN, Descripción, Cantidad, Precio unitario y Valorizado (cantidad × precio).
  if (llevaTabla(p.modelo)) {
    const col = { item: 25, pn: 82, cant: 40, precio: 78, valor: 84 };
    const anchoDesc = ANCHO - col.item - col.pn - col.cant - col.precio - col.valor;
    const T = 8.8;
    const cabecera = () => {
      pagina.drawRectangle({ x: X0, y: y - 18, width: ANCHO, height: 18, color: c.oscuro });
      const yy = y - 12;
      const r = (s: string, x: number, alDer = false, ancho = 0) => {
        const u = textoPdf(s).toUpperCase();
        const w = espaciado(u, negrita, 7.4, 0.4);
        dibujarEspaciado(u, alDer ? x + ancho - 6 - w : x + 6, yy, negrita, 7.4, 0.4, BLANCO);
      };
      let x = X0;
      r("Ítem", x);
      x += col.item;
      r("PN", x);
      x += col.pn;
      r("Descripción", x);
      x += anchoDesc;
      r("Cant.", x, true, col.cant);
      x += col.cant;
      r("P. unitario", x, true, col.precio);
      x += col.precio;
      r("Valorizado", x, true, col.valor);
      y -= 18;
    };
    if (lugar(60)) y -= 0;
    cabecera();
    p.renglones.forEach((r, i) => {
      const pn = partirTexto(textoPdf(r.pn), mono, 8.4, col.pn - 10);
      const desc = partirTexto(textoPdf(r.descripcion), normal, T, anchoDesc - 10);
      const lineas = Math.max(pn.length, desc.length);
      const alto = lineas * 11 + 9;
      if (lugar(alto + 4)) cabecera();
      if (i % 2 === 1) pagina.drawRectangle({ x: X0, y: y - alto, width: ANCHO, height: alto, color: ZEBRA });
      const yy = y - 13;
      let x = X0;
      const item = String(i + 1);
      pagina.drawText(item, { x: x + col.item / 2 - normal.widthOfTextAtSize(item, T) / 2, y: yy, size: T, font: normal, color: TINTA });
      x += col.item;
      pn.forEach((l, k) => pagina.drawText(l, { x: x + 6, y: yy - k * 11, size: 8.4, font: mono, color: TINTA }));
      x += col.pn;
      desc.forEach((l, k) => pagina.drawText(l, { x: x + 6, y: yy - k * 11, size: T, font: normal, color: TINTA }));
      x += anchoDesc;
      if (r.cantidad != null) derecha(formatoCantidad(r.cantidad), x + col.cant - 6, yy, normal, T, TINTA);
      x += col.cant;
      if (r.precio != null) derecha(precioUsd(r.precio), x + col.precio - 6, yy, normal, T, TINTA);
      x += col.precio;
      const v = valorizado(r);
      if (v != null) derecha(precioUsd(v), x + col.valor - 6, yy, normal, T, TINTA);
      y -= alto;
      pagina.drawRectangle({ x: X0, y, width: ANCHO, height: 0.7, color: LINEA });
    });
    lugar(26);
    y -= 0;
    cajaTotal(p.modelo === "repuestos" ? "Total presupuestado" : "Subtotal repuestos", t.repuestos, X0 + ANCHO);
    y -= 16;
  }

  // Cuadro de detalle: mano de obra y logística (modelo 2) o el servicio (modelo 3), con el precio a la derecha.
  if (llevaDetalle(p.modelo) && p.detalles.length) {
    const anchoPrecio = 92;
    const anchoTexto = ANCHO - 24 - anchoPrecio;
    const borde = hex("#d5dbe5");
    const cabeceraDetalle = () => {
      pagina.drawRectangle({ x: X0, y: y - 20, width: ANCHO, height: 20, color: c.suave, borderColor: borde, borderWidth: 0.8 });
      rotulo(tituloDetalle(p.modelo), X0 + 10, y - 13, c.acento);
      y -= 20;
    };
    lugar(70);
    cabeceraDetalle();
    p.detalles.forEach((d, i) => {
      const lineas = parrafos(d.descripcion).flatMap((l) => partirTexto(l, normal, 9.4, anchoTexto));
      const alto = lineas.length * 12.5 + 12;
      if (lugar(alto + 4)) cabeceraDetalle();
      const yy = y - 15;
      lineas.forEach((l, k) => pagina.drawText(l, { x: X0 + 10, y: yy - k * 12.5, size: 9.4, font: normal, color: TINTA }));
      derecha(d.precio != null && d.precio !== 0 ? precioUsd(d.precio) : d.precio === 0 ? "Sin cargo" : "", X0 + ANCHO - 10, yy, negrita, 9.4, TINTA);
      pagina.drawLine({ start: { x: X0, y }, end: { x: X0, y: y - alto }, thickness: 0.8, color: borde });
      pagina.drawLine({ start: { x: X0 + ANCHO, y }, end: { x: X0 + ANCHO, y: y - alto }, thickness: 0.8, color: borde });
      y -= alto;
      if (i < p.detalles.length - 1)
        pagina.drawLine({ start: { x: X0 + 10, y }, end: { x: X0 + ANCHO - 10, y }, thickness: 0.6, color: LINEA, dashArray: [3, 3] });
    });
    lugar(36);
    pagina.drawRectangle({ x: X0, y: y - 32, width: ANCHO, height: 32, borderColor: borde, borderWidth: 0.8 });
    y -= 6;
    cajaTotal(p.modelo === "servicios" ? "Total presupuestado" : "Total general (repuestos + servicios)", t.total, X0 + ANCHO - 10);
    y -= 6;
  }

  y -= 4;
  derecha(LEYENDA_IVA, X0 + ANCHO, y - 8, negrita, 8, c.gris);
  y -= 28;

  // Condiciones de la oferta, numeradas, con lo que se escribió al lado de cada una.
  const conds = condiciones(p);
  lugar(30 + conds.length * 16);
  rotulo("Condiciones de la oferta", X0, y, c.acento);
  y -= 8;
  const colValor = 52 * MM;
  conds.forEach(([k, v], i) => {
    const lineas = parrafos(v || "—").flatMap((l) => partirTexto(l, normal, 9.2, ANCHO - colValor));
    const alto = lineas.length * 12 + 9;
    lugar(alto);
    const yy = y - 13;
    pagina.drawText(`${i + 1}.`, { x: X0, y: yy, size: 9.2, font: negrita, color: c.acento });
    pagina.drawText(textoPdf(k), { x: X0 + 14, y: yy, size: 9.2, font: negrita, color: TINTA });
    lineas.forEach((l, n) => pagina.drawText(l, { x: X0 + colValor, y: yy - n * 12, size: 9.2, font: normal, color: v ? TINTA : c.gris }));
    y -= alto;
    pagina.drawRectangle({ x: X0, y, width: ANCHO, height: 0.6, color: hex("#e4e8ee") });
  });

  // Saludo y firma de cada empresa.
  y -= 18;
  lugar(m.cierre.length * 13 + 90);
  m.cierre.forEach((l) => {
    pagina.drawText(textoPdf(l), { x: X0, y: y - 10, size: 9.6, font: normal, color: TINTA });
    y -= 13;
  });
  y -= 30;
  pagina.drawRectangle({ x: X0, y, width: 55 * MM, height: 0.7, color: TINTA });
  y -= 14;
  pagina.drawText(textoPdf(m.firma.nombre), { x: X0, y, size: 10.2, font: negrita, color: TINTA });
  y -= 13;
  pagina.drawText(textoPdf(m.firma.cargo), { x: X0, y, size: 9.4, font: normal, color: c.gris });
  for (const l of m.firma.lineas) {
    y -= 12.5;
    pagina.drawText(textoPdf(l), { x: X0, y, size: 9.4, font: normal, color: p.membrete === "daysa" ? c.acento : TINTA });
  }

  const paginas = doc.getPages();
  if (paginas.length > 1)
    paginas.forEach((pg, i) => {
      const s = `Página ${i + 1} de ${paginas.length}`;
      pg.drawText(s, { x: X0 + ANCHO - normal.widthOfTextAtSize(s, 7.5), y: PISO - 14, size: 7.5, font: normal, color: c.gris });
    });
  return doc.save();
}
