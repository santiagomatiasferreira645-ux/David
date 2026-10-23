// Convierte la planilla de la fase 0 (fase0_proveedores.xlsx) en un archivo SQL
// para pegar en Supabase: SQL Editor > New query > pegar > Run.
//
// Uso: npm run importar -- ruta/fase0_proveedores.xlsx > importar.sql
//
// El SQL resultante tiene datos de contactos: no lo subas al repositorio.
import ExcelJS from "exceljs";

type Fila = Record<string, unknown>;

async function leerHoja(wb: ExcelJS.Workbook, nombre: string): Promise<Fila[]> {
  const ws = wb.getWorksheet(nombre);
  if (!ws) throw new Error(`La planilla no tiene la hoja "${nombre}"`);
  const encabezados: string[] = [];
  ws.getRow(1).eachCell((c, i) => (encabezados[i] = String(c.value ?? "").trim()));
  const filas: Fila[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const f: Fila = {};
    // Dos columnas pueden llamarse igual ("Email" dato y "Email" link): gana la primera.
    row.eachCell({ includeEmpty: false }, (c, i) => {
      const k = encabezados[i];
      if (k && !(k in f)) f[k] = valor(c.value);
    });
    if (Object.keys(f).length) filas.push(f);
  });
  return filas;
}

function valor(v: ExcelJS.CellValue): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object" && "formula" in v) return null; // columnas de links calculados
  if (typeof v === "object" && "text" in v) return (v as { text: string }).text;
  return v;
}

export function sql(v: unknown): string {
  if (v === null || v === undefined || v === "") return "null";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  return `'${String(v).replace(/'/g, "''")}'`;
}

const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const fecha = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

const TIENE_WA = new Set(["Sí", "No", "No sé"]);
const CANALES = new Set(["Email", "WhatsApp", "Llamada", "WeChat", "Telegram", "Formulario web"]);
const TIPOS_PRECIO = new Set(["Cotización del proveedor", "Referencia de mercado", "Flete / servicio", "Precio propio / oferta nuestra"]);

async function main() {
  const ruta = process.argv[2];
  if (!ruta) {
    console.error("Uso: npm run importar -- fase0_proveedores.xlsx > importar.sql");
    process.exit(1);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta);
  const proveedores = await leerHoja(wb, "Proveedores");
  const contactos = await leerHoja(wb, "Contactos");
  const cotizaciones = await leerHoja(wb, "Cotizaciones");
  const consultas = await leerHoja(wb, "PN consultados");
  const ids = new Set(proveedores.map((p) => String(p["ID"])));
  const prov = (v: unknown) => (v && ids.has(String(v)) ? sql(v) : "null");

  const out: string[] = [
    "begin;",
    "do $$ begin if exists (select 1 from proveedores) then raise exception 'La base ya tiene proveedores: la importación de la fase 0 se corre una sola vez.'; end if; end $$;",
  ];
  for (const p of proveedores) {
    out.push(
      `insert into proveedores (id, empresa, pais, ciudad, zona_horaria, idioma, marcas, tipo, web, calificacion, origen, productos, notas) values (` +
        [p["ID"], p["Empresa"], p["País"], p["Ciudad"], p["Zona horaria"], p["Idioma"], p["Marcas"], p["Tipo"], p["Web"], num(p["Calificación 1-5"]), p["Origen del dato"], p["Qué vende"], p["Notas de los chats"]]
          .map(sql)
          .join(", ") +
        `) on conflict (id) do nothing;`,
    );
  }
  for (const c of contactos) {
    if (!ids.has(String(c["ID"]))) continue;
    const wa = TIENE_WA.has(String(c["Tiene WhatsApp"])) ? c["Tiene WhatsApp"] : "No sé";
    const canal = CANALES.has(String(c["Canal preferido"])) ? c["Canal preferido"] : null;
    out.push(
      `insert into contactos (proveedor_id, nombre, cargo, email, telefono, tiene_whatsapp, canal_preferido, origen, notas) values (` +
        [c["ID"], c["Nombre"], c["Cargo"], c["Email"], c["Teléfono"], wa, canal, c["Origen"], c["Notas"]].map(sql).join(", ") +
        `);`,
    );
  }
  for (const q of cotizaciones) {
    if (num(q["Precio unit."]) === null) continue;
    const tipo = TIPOS_PRECIO.has(String(q["Tipo de precio"])) ? q["Tipo de precio"] : "Cotización del proveedor";
    out.push(
      `insert into cotizaciones (proveedor_id, fecha, pn, marca, descripcion, modelo_motor, cantidad, precio_unitario, moneda, incoterm, plazo_dias, condicion, tipo_precio, notas, origen) values (` +
        [
          prov(q["ID"]),
          sql(fecha(q["Fecha"])),
          sql(q["PN"]),
          sql(q["Marca"]),
          sql(q["Descripción"]),
          sql(q["Modelo motor"]),
          sql(num(q["Cant."])),
          sql(num(q["Precio unit."])),
          sql(q["Moneda"]),
          sql(q["Incoterm"]),
          sql(num(q["Plazo (días)"]) === null ? null : Math.round(num(q["Plazo (días)"])!)),
          sql(q["Condición"]),
          sql(tipo),
          sql(q["Notas"]),
          sql(q["Chat de origen"] ? `WhatsApp: ${q["Chat de origen"]}` : "Fase 0"),
        ].join(", ") +
        `);`,
    );
  }
  for (const c of consultas) {
    if (!c["PN"]) continue;
    out.push(
      `insert into consultas_pn (proveedor_id, fecha, pn, marca, descripcion, modelo_motor) values (` +
        [prov(c["ID"]), sql(fecha(c["Fecha"])), sql(c["PN"]), sql(c["Marca"]), sql(c["Descripción"]), sql(c["Modelo motor"])].join(", ") +
        `);`,
    );
  }
  out.push("commit;");
  process.stdout.write(out.join("\n") + "\n");
  console.error(`${proveedores.length} proveedores, ${contactos.length} contactos, ${cotizaciones.length} precios, ${consultas.length} PN consultados.`);
}

if (process.argv[1]?.includes("importar-fase0")) main();
