import type { PDFPageProxy } from "pdfjs-dist";

type Fragmento = { str: string; transform: number[]; width: number; height: number };

// Texto de una página de PDF armado renglón por renglón, con espacios donde había columnas, para que la IA vea la tabla.
export async function textoDePagina(pagina: PDFPageProxy): Promise<string> {
  const contenido = await pagina.getTextContent();
  const fragmentos = (contenido.items as Fragmento[]).filter((f) => f.str?.trim());
  const renglones: { y: number; alto: number; partes: Fragmento[] }[] = [];
  for (const f of fragmentos) {
    const y = f.transform[5];
    const alto = Math.abs(f.height) || Math.abs(f.transform[3]) || 8;
    const renglon = renglones.find((r) => Math.abs(r.y - y) < Math.min(r.alto, alto) * 0.5);
    if (renglon) renglon.partes.push(f);
    else renglones.push({ y, alto, partes: [f] });
  }
  return renglones
    .sort((a, b) => b.y - a.y)
    .map((r) => {
      const partes = r.partes.sort((a, b) => a.transform[4] - b.transform[4]);
      let linea = "";
      let fin = 0;
      for (const p of partes) {
        const x = p.transform[4];
        const ancho = Math.abs(p.height || p.transform[3] || 8) * 0.5;
        if (linea) linea += x - fin > ancho * 3 ? "   " : x - fin > ancho * 0.3 ? " " : "";
        linea += p.str;
        fin = x + p.width;
      }
      return linea.trimEnd();
    })
    .join("\n");
}

// Una página vale la pena mandarla a la IA si tiene al menos un par de códigos con dígitos.
export function pareceListaDePartes(texto: string): boolean {
  return (texto.match(/\b(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{3,}\b/gi) ?? []).length >= 2;
}

// Recuadra en el canvas ya dibujado los textos de la página que contienen el PN (sin guiones ni espacios).
// En PDF escaneados no hay texto, así que no marca nada. Devuelve cuántas marcas hizo.
export async function marcarPn(pagina: PDFPageProxy, transform: number[], ctx: CanvasRenderingContext2D, pn: string): Promise<number> {
  const buscado = pn.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (buscado.length < 3) return 0;
  const contenido = await pagina.getTextContent();
  let marcas = 0;
  for (const f of contenido.items as Fragmento[]) {
    if (!f.str || !f.str.replace(/[^A-Za-z0-9]/g, "").toUpperCase().includes(buscado)) continue;
    // Matriz del texto llevada a pixeles del canvas (misma cuenta que pdfjs.Util.transform).
    const [a, b, c, d, e, g] = transform;
    const [ta, tb, tc, td, te, tf] = f.transform;
    const m = [a * ta + c * tb, b * ta + d * tb, a * tc + c * td, b * tc + d * td, a * te + c * tf + e, b * te + d * tf + g];
    const escala = Math.hypot(a, b);
    const alto = Math.hypot(m[2], m[3]);
    const ancho = f.width * escala;
    const margen = alto * 0.35;
    ctx.save();
    ctx.fillStyle = "rgba(250, 204, 21, 0.35)";
    ctx.strokeStyle = "rgba(220, 38, 38, 0.9)";
    ctx.lineWidth = Math.max(2, alto * 0.12);
    ctx.fillRect(m[4] - margen, m[5] - alto - margen, ancho + margen * 2, alto + margen * 2);
    ctx.strokeRect(m[4] - margen, m[5] - alto - margen, ancho + margen * 2, alto + margen * 2);
    ctx.restore();
    marcas++;
  }
  return marcas;
}
