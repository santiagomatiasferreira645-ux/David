import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODELO_IA = "claude-opus-5-5";

export type SugerenciaIA = {
  empresa: string;
  pais: string;
  ciudad: string | null;
  web: string | null;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  tipo: string;
  lista_el_pn: boolean;
  motivo: string;
  fuente: string;
};

const TIPOS = ["Distribuidor oficial", "Distribuidor", "Especialista aftermarket", "Fabricante", "Usados / reacondicionados", "Marketplace"];

const texto = { type: "string" } as const;
const opcional = { type: ["string", "null"] } as const;

// La IA entrega el resultado llamando a esta herramienta; strict garantiza que los datos respeten el esquema.
const ENTREGAR: Anthropic.Beta.BetaTool = {
  name: "entregar_proveedores",
  description: "Entrega la lista final de proveedores encontrados. Llamala una sola vez, al terminar de buscar.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["proveedores"],
    properties: {
      proveedores: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["empresa", "pais", "ciudad", "web", "email", "telefono", "whatsapp", "tipo", "lista_el_pn", "motivo", "fuente"],
          properties: {
            empresa: texto,
            pais: { ...texto, description: "País en castellano: USA, Brasil, Argentina, China, India, Bangladesh, Alemania..." },
            ciudad: opcional,
            web: opcional,
            email: { ...opcional, description: "Solo si figura en la fuente. Nunca inventar." },
            telefono: { ...opcional, description: "Formato internacional con +, solo si figura en la fuente." },
            whatsapp: { ...opcional, description: "Número de WhatsApp con +, solo si la fuente dice que es WhatsApp." },
            tipo: { type: "string", enum: TIPOS },
            lista_el_pn: { type: "boolean", description: "true si la fuente muestra este PN exacto (o su equivalente)." },
            motivo: { ...texto, description: "Una frase en castellano: por qué sirve para este repuesto." },
            fuente: { ...texto, description: "URL donde se verificó la información." },
          },
        },
      },
    },
  },
};

const SISTEMA = `Sos el asistente de compras de un grupo de empresas de servicios navales de Sudamérica (DAYSA, Técnica Naval y Servicios, SPES Supplier). Buscan repuestos de motores marinos y cajas reductoras por número de parte (PN) y marca.

Tu tarea: buscar en la web proveedores alternativos que puedan vender el repuesto pedido y entregarlos con la herramienta entregar_proveedores.

Criterio:
- Primero, empresas que muestren el PN exacto en su catálogo o tienda (o un número equivalente/supersedido). Después, distribuidores oficiales y especialistas en repuestos de esa marca y ese tipo de motor o reductor. También sirven los que venden usados o reacondicionados.
- Países de compra habituales: USA, Brasil, Argentina, China, India, Bangladesh, resto de América y Europa.
- No incluyas las empresas de la lista "ya están en nuestra base".
- Los datos de contacto tienen que salir de la web oficial de la empresa o de la fuente citada. Si no los encontrás, dejalos en null; nunca los inventes.
- Hasta 8 proveedores, los más útiles primero. Si no encontrás ninguno confiable, entregá la lista vacía.`;

export async function buscarProveedoresIA(args: {
  pn: string;
  marca: string;
  cantidad: number | null;
  conocidos: string[];
}): Promise<SugerenciaIA[]> {
  // Vercel corta la función a los 60 s: se deja margen para devolver un mensaje claro en vez de un corte mudo.
  const limite = Date.now() + 52_000;
  const client = new Anthropic({ maxRetries: 1 });
  const pedido =
    `Repuesto: PN ${args.pn}${args.marca ? `, marca ${args.marca}` : ""}, cantidad ${args.cantidad ?? 1}.\n` +
    `Ya están en nuestra base (no repetir): ${args.conocidos.length ? args.conocidos.join("; ") : "ninguno"}.`;

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: pedido }];

  // La búsqueda web corre del lado de Anthropic; si se pausa (pause_turn) se reenvía para que continúe.
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const restante = limite - Date.now();
    if (restante < 5_000) throw new Anthropic.APIConnectionTimeoutError();
    const respuesta = await client.beta.messages.create(
      {
        model: MODELO_IA,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: SISTEMA,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }, ENTREGAR],
        messages,
      },
      { timeout: restante },
    );

    if (respuesta.stop_reason === "refusal") return [];
    const entrega = respuesta.content.find(
      (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === ENTREGAR.name,
    );
    if (entrega) return ((entrega.input as { proveedores?: SugerenciaIA[] }).proveedores ?? []).slice(0, 8);
    if (respuesta.stop_reason !== "pause_turn") return [];
    messages.push({ role: "assistant", content: respuesta.content });
  }
  return [];
}

// Traduce el error de la API a un mensaje que diga qué pasó y qué hacer, en vez de un "falló" genérico.
export function explicarErrorIA(e: unknown): string {
  const detalle = e instanceof Anthropic.APIError ? String(e.message ?? "").toLowerCase() : "";
  if (e instanceof Anthropic.APIConnectionTimeoutError) {
    return "La búsqueda con IA tardó más de lo que permite el servidor (60 s). Probá de nuevo.";
  }
  if (e instanceof Anthropic.AuthenticationError) {
    return "La clave de IA (ANTHROPIC_API_KEY) cargada en Vercel no es válida o fue revocada. Hay que crear una nueva en platform.claude.com y reemplazarla en Vercel.";
  }
  if (e instanceof Anthropic.PermissionDeniedError) {
    return "La cuenta de Anthropic no tiene permiso para esta búsqueda. Revisá en platform.claude.com que la búsqueda web esté habilitada y que la clave tenga acceso al modelo.";
  }
  if (e instanceof Anthropic.RateLimitError) {
    return "Se alcanzó el límite de uso de la cuenta de Anthropic. Probá de nuevo en unos minutos.";
  }
  if (e instanceof Anthropic.BadRequestError) {
    if (detalle.includes("credit balance")) {
      return "La cuenta de Anthropic se quedó sin crédito. Hay que cargar saldo en platform.claude.com > Billing.";
    }
    if (detalle.includes("web search") || detalle.includes("web_search")) {
      return "La búsqueda web no está habilitada en la cuenta de Anthropic. Activala en platform.claude.com > Settings > Privacy.";
    }
    return `La API de IA rechazó el pedido: ${e.message}`;
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return "No se pudo conectar con el servicio de IA. Probá de nuevo en unos minutos.";
  }
  if (e instanceof Anthropic.APIError && (e.status ?? 0) >= 500) {
    return "El servicio de IA está saturado o con problemas. Probá de nuevo en unos minutos.";
  }
  return "La búsqueda con IA falló. Probá de nuevo en unos minutos.";
}
