import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIAS_SERVICIO, type PresupuestoLeido } from "./presupuestos";

// Leer un presupuesto (a veces escaneado o fotografiado) y separar repuestos de servicios pide criterio: Opus con esfuerzo bajo.
export const MODELO_PRESUPUESTO = "claude-opus-5-5";

export type Entrada =
  | { tipo: "pdf"; base64: string }
  | { tipo: "imagen"; base64: string; mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }
  | { tipo: "texto"; texto: string };

const texto = { type: "string" } as const;
// Los textos que pueden faltar van vacíos y no null: la API admite pocos campos con más de un tipo.
const opcional = { type: "string", description: "Vacío si no figura." } as const;
const numero = { type: ["number", "null"] } as const;

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["es_presupuesto", "documento", "tipo", "empresa", "numero", "fecha", "cliente", "proveedor", "moneda", "total", "condiciones", "items"],
  properties: {
    es_presupuesto: {
      type: "boolean",
      description: "true si el documento cotiza precios: presupuesto, cotización, proforma, oferta, lista de precios. false si es factura, remito, orden de compra, nota de pedido, recibo, calendario, constancia, informe u otro documento.",
    },
    documento: { type: "string", description: "Qué tipo de documento es, en dos o tres palabras (ej. Presupuesto, Factura, Remito, Orden de compra)." },
    tipo: { type: "string", enum: ["propio", "proveedor"], description: "propio: lo emitió una de nuestras empresas a un cliente. proveedor: nos lo mandó un proveedor o taller." },
    empresa: { ...opcional, description: "Empresa nuestra que lo emitió (DAYSA, Técnica Naval y Servicios, SPES Supplier), solo si es propio. Vacío si no figura." },
    numero: { ...opcional, description: "Número de presupuesto, cotización, proforma u oferta. Vacío si no figura." },
    fecha: { ...opcional, description: "Fecha de emisión en formato AAAA-MM-DD. Vacío si no figura." },
    cliente: { ...opcional, description: "Cliente, armador o embarcación a quien va dirigido. Vacío si no figura." },
    proveedor: { ...opcional, description: "Empresa que cotiza, si es de proveedor. Vacío si no figura." },
    moneda: { ...opcional, description: "Código ISO: USD, EUR, ARS, PYG, BRL... Vacío si no figura." },
    total: numero,
    condiciones: { ...opcional, description: "Forma de pago, plazo de entrega, validez, incoterm, en una línea. Vacío si no figura." },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["clase", "pn", "marca", "descripcion", "modelo_motor", "cantidad", "unidad", "precio_unitario", "moneda", "plazo_dias", "categoria", "notas"],
        properties: {
          clase: { type: "string", enum: ["repuesto", "servicio"] },
          pn: { ...opcional, description: "Número de parte exacto, solo en repuestos. Vacío si no figura." },
          marca: opcional,
          descripcion: texto,
          modelo_motor: { ...opcional, description: "Motor, reductor o equipo al que aplica (ej. EMD 16-645, CAT 3512). Vacío si no figura." },
          cantidad: numero,
          unidad: { ...opcional, description: "un, hora, día, global, servicio... Vacío si no figura." },
          precio_unitario: { ...numero, description: "Precio por unidad. Si solo figura el total del renglón, dividilo por la cantidad." },
          moneda: opcional,
          plazo_dias: { type: ["integer", "null"] },
          categoria: { type: "string", enum: [...CATEGORIAS_SERVICIO, "No aplica"], description: "Solo en servicios; en repuestos 'No aplica'." },
          notas: { ...opcional, description: "Reemplazos, condición (nuevo, usado, reacondicionado), descuentos u otra aclaración del renglón. Vacío si no figura." },
        },
      },
    },
  },
} as const;

const SISTEMA = `Recibís un presupuesto, cotización u oferta de un grupo de empresas de servicios navales de Sudamérica (DAYSA, Técnica Naval y Servicios, SPES Supplier). Puede ser uno que emitimos nosotros a un cliente, o uno que nos mandó un proveedor o un taller parcero. Puede estar en castellano, inglés o portugués, y venir escaneado o fotografiado.

Primero decidí si el documento es realmente un presupuesto (cotiza precios a futuro). Si no lo es (factura, remito, orden de compra, recibo, calendario, constancia...), marcá es_presupuesto en false, decí qué documento es y devolvé items vacío.

Si es un presupuesto, devolvé los datos del encabezado y cada renglón cotizado, para usarlos después como precio de referencia.

Reglas:
- Cada renglón es "repuesto" (una pieza o material, con o sin PN) o "servicio" (mano de obra, overhaul, reparación, rectificado, inspección, montaje, flete, viáticos, alquiler de equipo).
- Copiá el PN exacto como figura; nunca lo inventes. Si no hay PN, vacío.
- Los precios van como número, sin separadores de miles (1.250,50 es 1250.5). Si hay descuento por renglón, usá el precio final.
- No incluyas subtotales, impuestos ni totales como renglones.
- Si un texto no figura, dejalo vacío; si un número no figura, null. Nunca inventes.`;

export async function leerPresupuesto(entrada: Entrada, nombreArchivo: string): Promise<PresupuestoLeido> {
  const client = new Anthropic();
  const contenido: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (entrada.tipo === "pdf") {
    contenido.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: entrada.base64 } });
  } else if (entrada.tipo === "imagen") {
    contenido.push({ type: "image", source: { type: "base64", media_type: entrada.mime, data: entrada.base64 } });
  } else {
    contenido.push({ type: "text", text: `Contenido del archivo (texto extraído de un Word o una planilla):\n${entrada.texto}` });
  }
  contenido.push({ type: "text", text: `Archivo: ${nombreArchivo}. Extraé el presupuesto.` });

  const respuesta = await client.beta.messages
    .stream({
      model: MODELO_PRESUPUESTO,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      system: SISTEMA,
      messages: [{ role: "user", content: contenido }],
    })
    .finalMessage();

  if (respuesta.stop_reason === "refusal") throw new Error("La IA no pudo leer este archivo.");
  if (respuesta.stop_reason === "max_tokens") throw new Error("El presupuesto es demasiado largo para leerlo de una vez.");
  const salida = respuesta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? "";
  return JSON.parse(salida) as PresupuestoLeido;
}
