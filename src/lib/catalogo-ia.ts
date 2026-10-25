import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// La extracción es texto estructurado y largo: Sonnet alcanza y cuesta bastante menos que Opus.
export const MODELO_CATALOGO = "claude-sonnet-5-5";

export type PaginaTexto = { pagina: number; texto: string };
export type FilaExtraida = { pn: string; descripcion: string | null; lista: string | null; titulo: string | null; pagina: number; nota: string | null };

const opcional = { type: ["string", "null"] } as const;

const ESQUEMA = {
  type: "object",
  additionalProperties: false,
  required: ["paginas"],
  properties: {
    paginas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pagina", "lista", "titulo", "items"],
        properties: {
          pagina: { type: "integer" },
          lista: { ...opcional, description: "Número de lista de partes, figura o grupo que indica la página (ej. B18, Fig. 12, 1-4)." },
          titulo: { ...opcional, description: "Título de la lista o del conjunto de la página, en el idioma del manual." },
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["pn", "descripcion", "nota"],
              properties: {
                pn: { type: "string", description: "Número de parte exactamente como figura, sin agregar ni quitar caracteres." },
                descripcion: { ...opcional, description: "Descripción de la pieza como figura en el manual, con los espacios del escaneo corregidos." },
                nota: { ...opcional, description: "Reemplazos o equivalencias que indique el manual (ej. 'Reemplazado por 9525737'), cantidad o modelos de motor a los que aplica." },
              },
            },
          },
        },
      },
    },
  },
} as const;

const SISTEMA = `Recibís el texto de páginas de un manual de repuestos (catálogo de partes) de motores o reductores marinos, extraído de un PDF. El texto puede venir de un escaneo con errores de reconocimiento: letras separadas por espacios, "l" o "]" en lugar de "1", "O" en lugar de "0" dentro de números.

Tu tarea: devolver, para cada página, los números de parte (PN) que aparecen en sus tablas o listas de piezas, con su descripción.

Reglas:
- Un ítem por cada PN de pieza. Si un renglón tiene varios PN (por ejemplo, uno por modelo de motor), un ítem por cada uno, con la misma descripción y el modelo en la nota.
- Copiá el PN exacto. Corregí solo errores evidentes del escaneo dentro del número (una "O" entre dígitos es "0", una "l" es "1"); nunca inventes dígitos.
- No incluyas números que no son PN: números de ítem o de referencia del dibujo, cantidades, páginas, medidas, fechas ni números de figura.
- Las páginas de tapa, índice general, índice numérico, instrucciones o dibujos sin lista de piezas van con items vacíos.
- La descripción queda en el idioma del manual. Arreglá las palabras cortadas por el escaneo ("WAS HER" es "WASHER") sin traducir ni resumir.
- Devolvé todas las páginas recibidas, con el mismo número de página.`;

export async function extraerPaginas(catalogo: string, paginas: PaginaTexto[]): Promise<FilaExtraida[]> {
  const client = new Anthropic();
  const contenido =
    `Catálogo: ${catalogo}\n\n` + paginas.map((p) => `=== PÁGINA ${p.pagina} ===\n${p.texto}`).join("\n\n");
  const respuesta = await client.messages
    .stream({
      model: MODELO_CATALOGO,
      max_tokens: 32000,
      thinking: { type: "between_tools" },
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      system: SISTEMA,
      messages: [{ role: "user", content: contenido }],
    })
    .finalMessage();

  if (respuesta.stop_reason === "refusal") return [];
  if (respuesta.stop_reason === "max_tokens") throw new Error("Respuesta demasiado larga");
  const texto = respuesta.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
  const datos = JSON.parse(texto) as { paginas: { pagina: number; lista: string | null; titulo: string | null; items: { pn: string; descripcion: string | null; nota: string | null }[] }[] };
  const validas = new Set(paginas.map((p) => p.pagina));
  return datos.paginas
    .filter((p) => validas.has(p.pagina))
    .flatMap((p) =>
      p.items
        .filter((i) => /\d/.test(i.pn) && i.pn.trim().length >= 3)
        .map((i) => ({ pn: i.pn.trim(), descripcion: i.descripcion, nota: i.nota, lista: p.lista, titulo: p.titulo, pagina: p.pagina })),
    );
}
