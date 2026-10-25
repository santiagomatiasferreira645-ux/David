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
