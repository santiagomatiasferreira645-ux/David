import { normalizarPn } from "./pn";

export type ItemLista = { pn: string; cantidad: number; descripcion: string };

const CABECERA_PN = /^(p\/?n\b|part ?(n|#)|n[uú]mero de parte|c[oó]d|ref)/i;
const CABECERA_CANTIDAD = /^(cant|qty|quant|q\.?ty|unid|uds)/i;
const CABECERA_DESCRIPCION = /^(desc|detalle|nombre|art[ií]culo|producto)/i;

const pareceCantidad = (s: string) => /^\d{1,4}([.,]0+)?$/.test(s.trim()) && Number(s.replace(",", ".")) > 0;
const pareceTexto = (s: string) => /[a-záéíóúñ]{3,}\s+[a-záéíóúñ]{2,}/i.test(s);
const parecePn = (s: string) => {
  const n = normalizarPn(s);
  return n.length >= 4 && n.length <= 20 && /\d/.test(n) && (s.trim().match(/\s/g)?.length ?? 0) <= 2;
};

// Lo que se pega desde Excel: filas separadas por salto de línea y celdas por tabulador.
// Sin tabuladores se toma como una lista de PN separados por línea, coma o punto y coma.
// Elige la columna del PN, la de la cantidad y la de la descripción por la cabecera o, si no hay, por el contenido.
export function leerListaPn(texto: string): ItemLista[] {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (!lineas.length) return [];

  if (!texto.includes("\t")) {
    return unir(
      lineas
        .flatMap((l) => l.split(/[,;]/))
        .map((s) => s.trim())
        .filter(parecePn)
        .map((pn) => ({ pn, cantidad: 1, descripcion: "" })),
    );
  }

  let filas = lineas.map((l) => l.split("\t").map((c) => c.trim()));
  const columnas = Math.max(...filas.map((f) => f.length));
  const cabecera = filas[0];
  const buscar = (re: RegExp) => cabecera.findIndex((c) => re.test(c));
  let iPn = buscar(CABECERA_PN);
  let iCant = buscar(CABECERA_CANTIDAD);
  let iDesc = buscar(CABECERA_DESCRIPCION);
  if (iPn >= 0 || iCant >= 0 || iDesc >= 0 || !cabecera.some(parecePn)) filas = filas.slice(1);

  const proporcion = (i: number, prueba: (s: string) => boolean) => {
    const celdas = filas.map((f) => f[i] ?? "").filter(Boolean);
    return celdas.length ? celdas.filter(prueba).length / filas.length : 0;
  };
  // Una columna 1, 2, 3... es el número de renglón, no una cantidad.
  const esRenglon = (i: number) => filas.length > 2 && filas.every((f, n) => Number(f[i]) === n + 1);
  const libres = () =>
    Array.from({ length: columnas }, (_, i) => i).filter((i) => i !== iPn && i !== iCant && i !== iDesc && !esRenglon(i));
  const mejor = (prueba: (s: string) => boolean, minimo: number) => {
    let elegida = -1;
    let puntaje = minimo;
    for (const i of libres()) {
      const p = proporcion(i, prueba);
      if (p > puntaje) [elegida, puntaje] = [i, p];
    }
    return elegida;
  };

  // La cantidad antes que el PN: un PN como 8455666 también es un número, pero una cantidad no pasa de 4 cifras.
  if (iCant < 0) iCant = mejor(pareceCantidad, 0.6);
  if (iPn < 0) iPn = mejor(parecePn, 0.3);
  if (iPn < 0) return [];
  if (iDesc < 0) iDesc = mejor(pareceTexto, 0.3);

  return unir(
    filas
      .filter((f) => parecePn(f[iPn] ?? ""))
      .map((f) => ({
        pn: f[iPn].trim(),
        cantidad: iCant >= 0 && pareceCantidad(f[iCant] ?? "") ? Number(f[iCant].replace(",", ".")) : 1,
        descripcion: iDesc >= 0 ? f[iDesc] ?? "" : "",
      })),
  );
}

// El mismo PN repetido en el pedido va una sola vez, con las cantidades sumadas.
function unir(items: ItemLista[]): ItemLista[] {
  const porPn = new Map<string, ItemLista>();
  for (const it of items) {
    const clave = normalizarPn(it.pn);
    const previo = porPn.get(clave);
    if (previo) {
      previo.cantidad += it.cantidad;
      previo.descripcion ||= it.descripcion;
    } else porPn.set(clave, { ...it });
  }
  return Array.from(porPn.values());
}
