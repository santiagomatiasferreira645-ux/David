import ExcelJS from "exceljs";
import { MOTIVO_TEXTO, type Resultado } from "./busqueda";
import { horaLocal, idiomaDe, linkLlamada, linkMail, linkWhatsapp } from "./contacto";

const COLUMNAS: { header: string; key: string; width: number }[] = [
  { header: "PN", key: "pn", width: 14 },
  { header: "Marca", key: "marca", width: 10 },
  { header: "Proveedor", key: "empresa", width: 30 },
  { header: "País", key: "pais", width: 12 },
  { header: "Motivo", key: "motivo", width: 22 },
  { header: "Último precio", key: "precio", width: 13 },
  { header: "Moneda", key: "moneda", width: 8 },
  { header: "Fecha precio", key: "fecha", width: 12 },
  { header: "Condición", key: "condicion", width: 15 },
  { header: "Plazo (días)", key: "plazo", width: 10 },
  { header: "Contacto", key: "contacto", width: 26 },
  { header: "Canal preferido", key: "canal", width: 13 },
  { header: "WhatsApp", key: "wa", width: 11 },
  { header: "Llamar", key: "tel", width: 9 },
  { header: "Email", key: "mail", width: 9 },
  { header: "Hora local", key: "hora", width: 15 },
  { header: "Estado", key: "estado", width: 14 },
  { header: "Notas", key: "notas", width: 40 },
];

export async function generarExcel(args: {
  pn: string;
  marca: string;
  cantidad: number | null;
  resultados: Resultado[];
  ahora?: Date;
}): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Resultados");
  ws.columns = COLUMNAS;
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };

  const link = (texto: string, url: string | null) => (url ? { text: texto, hyperlink: url } : "");

  for (const r of args.resultados) {
    const p = r.proveedor;
    const c = r.contactos[0];
    const q = r.ultimaCotizacion;
    const idioma = idiomaDe(p.idioma, p.pais);
    const consulta = { pn: args.pn, marca: args.marca, cantidad: args.cantidad, nombreContacto: c?.nombre?.split(" ")[0] };
    const h = horaLocal(p.zona_horaria, args.ahora);
    const fila = ws.addRow({
      pn: args.pn,
      marca: args.marca,
      empresa: p.empresa,
      pais: p.pais ?? "",
      motivo: MOTIVO_TEXTO[r.motivo],
      precio: q?.precio_unitario ?? "",
      moneda: q?.moneda ?? "",
      fecha: q?.fecha ?? "",
      condicion: q?.condicion ?? "",
      plazo: q?.plazo_dias ?? "",
      contacto: c?.nombre ?? "",
      canal: c?.canal_preferido ?? "",
      wa: link("WhatsApp", linkWhatsapp(c?.telefono, consulta, idioma)),
      tel: link("Llamar", linkLlamada(c?.telefono)),
      mail: link("Email", linkMail(c?.email, consulta, idioma)),
      hora: h ? `${h.hora} ${h.abierto ? "(abierto)" : "(cerrado)"}` : "",
      estado: "Sin contactar",
      notas: "",
    });
    for (const k of ["wa", "tel", "mail"]) {
      const celda = fila.getCell(k);
      if (celda.value) celda.font = { color: { argb: "FF0563C1" }, underline: true };
    }
  }

  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: { row: 1, column: COLUMNAS.length } };
  ws.getColumn("estado").eachCell((celda, n) => {
    if (n > 1) celda.dataValidation = { type: "list", allowBlank: true, formulae: ['"Sin contactar,Consultado,Cotizó,Descartado"'] };
  });

  const bytes = new Uint8Array(await wb.xlsx.writeBuffer());
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
