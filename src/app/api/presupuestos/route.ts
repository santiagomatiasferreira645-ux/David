import ExcelJS from "exceljs";
import WordExtractor from "word-extractor";
import { NextResponse } from "next/server";
import { leerPresupuesto, type Entrada } from "@/lib/presupuesto-ia";
import { buscarPorNombre, extension, filaServicio, limpiarLeido, MAX_BYTES } from "@/lib/presupuestos";
import { clienteServidor } from "@/lib/supabase/servidor";

// Un presupuesto por pedido; 60 segundos es el máximo del plan gratuito de Vercel.
export const maxDuration = 60;

const MAX_CARACTERES = 120000;
const IMAGENES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" } as const;

// Planilla a texto, una fila por renglón y las celdas separadas por tabulador.
async function excelATexto(datos: ArrayBuffer): Promise<string> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(datos);
  const partes: string[] = [];
  libro.eachSheet((hoja) => {
    partes.push(`=== Hoja: ${hoja.name} ===`);
    hoja.eachRow((fila) => {
      const valores = (fila.values as ExcelJS.CellValue[]).slice(1).map((v) => {
        if (v == null) return "";
        if (typeof v === "object") {
          if (v instanceof Date) return v.toISOString().slice(0, 10);
          if ("result" in v) return String(v.result ?? "");
          if ("richText" in v) return v.richText.map((t) => t.text).join("");
          if ("text" in v) return String(v.text);
        }
        return String(v);
      });
      if (valores.some((v) => v.trim())) partes.push(valores.join("\t"));
    });
  });
  return partes.join("\n");
}

// Word (.docx o el .doc viejo) a texto, con encabezado y pie, que suelen tener los datos de la empresa y del cliente.
async function wordATexto(datos: ArrayBuffer): Promise<string> {
  const doc = await new WordExtractor().extract(Buffer.from(datos));
  return [doc.getHeaders({ includeFooters: true }), doc.getBody(), doc.getFootnotes()].map((t) => t.trim()).filter(Boolean).join("\n\n");
}

async function armarEntrada(nombre: string, datos: ArrayBuffer): Promise<Entrada> {
  const ext = extension(nombre);
  if (ext === "pdf") return { tipo: "pdf", base64: Buffer.from(datos).toString("base64") };
  if (ext in IMAGENES) return { tipo: "imagen", base64: Buffer.from(datos).toString("base64"), mime: IMAGENES[ext as keyof typeof IMAGENES] };
  const texto =
    ext === "xlsx" ? await excelATexto(datos) : ext === "docx" || ext === "doc" ? await wordATexto(datos) : new TextDecoder().decode(datos);
  if (texto.length > MAX_CARACTERES) throw new Error("El archivo tiene demasiado texto. Separala en archivos más chicos.");
  return { tipo: "texto", texto };
}

// Lee con IA un presupuesto ya subido a Storage y guarda sus renglones. Si se vuelve a leer, reemplaza lo anterior.
export async function POST(request: Request) {
  const { presupuestoId } = (await request.json().catch(() => ({}))) as { presupuestoId?: number };
  if (!Number.isInteger(presupuestoId)) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Falta la clave de Anthropic en Vercel." }, { status: 503 });

  // Con la sesión del usuario: sin sesión, la seguridad de la base no deja leer nada.
  const supabase = clienteServidor();
  const { data: p } = await supabase.from("presupuestos").select("id, archivo, nombre_archivo").eq("id", presupuestoId!).maybeSingle();
  if (!p) return NextResponse.json({ error: "No se encontró el presupuesto." }, { status: 404 });

  const fallar = async (mensaje: string, status = 502) => {
    await supabase.from("presupuestos").update({ estado: "error", error: mensaje }).eq("id", p.id);
    return NextResponse.json({ error: mensaje }, { status });
  };

  try {
    const { data: archivo, error: errorDescarga } = await supabase.storage.from("presupuestos").download(p.archivo);
    if (errorDescarga || !archivo) return fallar("No se pudo abrir el archivo guardado.");
    if (archivo.size > MAX_BYTES) return fallar("El archivo pesa más de 15 MB.", 400);

    const nombre = p.nombre_archivo ?? p.archivo;
    const bruto = await leerPresupuesto(await armarEntrada(nombre, await archivo.arrayBuffer()), nombre);
    // Facturas, remitos, órdenes de compra y demás no se cargan: quedan marcados para borrarlos desde la lista.
    if (bruto.es_presupuesto === false) {
      await supabase.from("presupuesto_items").delete().eq("presupuesto_id", p.id);
      return fallar(`No es un presupuesto${bruto.documento?.trim() ? ` (${bruto.documento.trim().toLowerCase()})` : ""}: no se cargó.`, 422);
    }
    const leido = limpiarLeido(bruto);

    // Proveedor y cliente por nombre; la tabla clientes puede no existir todavía, en ese caso queda solo el texto.
    const [{ data: proveedores }, clientes] = await Promise.all([
      leido.tipo === "proveedor" && leido.proveedor
        ? supabase.from("proveedores").select("id, empresa").limit(5000)
        : Promise.resolve({ data: [] as { id: string; empresa: string }[] }),
      leido.tipo === "propio" && leido.cliente ? supabase.from("clientes").select("id, empresa").limit(5000) : Promise.resolve({ data: [], error: null }),
    ]);
    const proveedor = buscarPorNombre((proveedores ?? []).map((x) => ({ id: x.id, nombre: x.empresa })), leido.proveedor);
    const cliente = clientes.error ? null : buscarPorNombre(((clientes.data ?? []) as { id: string; empresa: string }[]).map((x) => ({ id: x.id, nombre: x.empresa })), leido.cliente);

    const encabezado = {
      tipo: leido.tipo,
      empresa: leido.empresa,
      numero: leido.numero,
      fecha: leido.fecha,
      cliente: leido.cliente,
      cliente_id: cliente?.id ?? null,
      proveedor_id: proveedor?.id ?? null,
      proveedor_nombre: leido.proveedor,
      moneda: leido.moneda,
      total: leido.total,
      condiciones: leido.condiciones,
    };

    await supabase.from("presupuesto_items").delete().eq("presupuesto_id", p.id);
    if (leido.items.length) {
      const { error } = await supabase.from("presupuesto_items").insert(
        leido.items.map((i) => ({
          presupuesto_id: p.id,
          clase: i.clase,
          pn: i.pn,
          marca: i.marca,
          descripcion: i.descripcion,
          modelo_motor: i.modelo_motor,
          cantidad: i.cantidad,
          unidad: i.unidad,
          precio_unitario: i.precio_unitario,
          moneda: i.moneda,
          plazo_dias: i.plazo_dias,
          notas: [i.clase === "servicio" && i.categoria !== "Otro" ? i.categoria : null, i.notas].filter(Boolean).join(" · ") || null,
        })),
      );
      if (error) throw error;
    }

    // Los servicios también van al módulo de Servicios. Si su tabla todavía no está creada, quedan solo en el presupuesto.
    const servicios = leido.items.filter((i) => i.clase === "servicio");
    let aviso: string | null = null;
    const borrado = await supabase.from("servicios").delete().eq("presupuesto_id", p.id);
    if (borrado.error) {
      if (servicios.length) aviso = "El módulo de Servicios todavía no está activado: los servicios quedaron solo en este presupuesto.";
    } else if (servicios.length) {
      const { error } = await supabase.from("servicios").insert(servicios.map((i) => filaServicio(i, { ...encabezado, id: p.id })));
      if (error) aviso = `Los servicios no se pudieron pasar al módulo de Servicios: ${error.message}`;
    }

    const { error } = await supabase.from("presupuestos").update({ ...encabezado, estado: "listo", error: aviso }).eq("id", p.id);
    if (error) throw error;
    return NextResponse.json({
      repuestos: leido.items.length - servicios.length,
      servicios: servicios.length,
      tipo: leido.tipo,
      aviso,
    });
  } catch (e) {
    return fallar(e instanceof Error ? e.message : String(e));
  }
}
