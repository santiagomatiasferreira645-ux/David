import "server-only";
import { normalizarPn } from "./pn";
import { clienteServidor } from "./supabase/servidor";

export const BUCKET_CATALOGOS = "catalogos";

export type FilaCatalogo = {
  id: number;
  catalogo: string;
  archivo: string;
  pn: string;
  descripcion: string | null;
  lista: string | null;
  titulo: string | null;
  pagina: number | null;
  nota: string | null;
};

const COLUMNAS = "id, catalogo, archivo, pn, descripcion, lista, titulo, pagina, nota";

// Coincidencia exacta del PN (normalizado) en los catálogos de fábrica.
export async function catalogoDelPn(pn: string): Promise<FilaCatalogo[]> {
  const pnN = normalizarPn(pn);
  if (!pnN) return [];
  const { data } = await clienteServidor()
    .from("catalogo_pn")
    .select(COLUMNAS)
    .eq("pn_normalizado", pnN)
    .order("pagina")
    .limit(50);
  return (data ?? []) as FilaCatalogo[];
}

// Si el texto parece un PN busca por número (también parcial); si no, por palabras de la descripción.
// Con `catalogos` se limita a esos manuales (los de una marca, o uno solo).
export async function buscarEnCatalogo(texto: string, catalogos?: string[]): Promise<FilaCatalogo[]> {
  const q = texto.trim();
  if (!q) return [];
  let consulta = clienteServidor().from("catalogo_pn").select(COLUMNAS);
  if (catalogos) consulta = consulta.in("catalogo", catalogos);
  const pnN = normalizarPn(q);
  if (/\d/.test(q) && pnN.length >= 4) {
    consulta = consulta.ilike("pn_normalizado", `%${pnN}%`);
  } else {
    for (const palabra of q.split(/\s+/).filter((p) => p.length > 1)) {
      consulta = consulta.ilike("descripcion", `%${palabra.replace(/[%,()*]/g, "")}%`);
    }
  }
  const { data } = await consulta.order("pn").order("pagina").limit(200);
  return (data ?? []) as FilaCatalogo[];
}

export type Catalogo = { nombre: string; archivo: string; paginas: number | null; estado: string; marca: string };

// Marcas conocidas, por cómo empieza el nombre del catálogo. Si no coincide ninguna, la marca es la primera palabra.
const MARCAS: [RegExp, string][] = [
  [/^(cat|caterpillar)\b/i, "Caterpillar"],
  [/^cummins\b/i, "Cummins"],
  [/^detroit\b/i, "Detroit Diesel"],
  [/^(emd|electro.?motive)\b/i, "EMD"],
  [/^john deere\b/i, "John Deere"],
  [/^scania\b/i, "Scania"],
  [/^volvo( penta)?\b/i, "Volvo Penta"],
  [/^mtu\b/i, "MTU"],
  [/^perkins\b/i, "Perkins"],
  [/^man\b/i, "MAN"],
  [/^(wartsila|wärtsilä)\b/i, "Wärtsilä"],
  [/^yanmar\b/i, "Yanmar"],
  [/^deutz\b/i, "Deutz"],
  [/^mitsubishi\b/i, "Mitsubishi"],
];

export function marcaDeCatalogo(nombre: string): string {
  const conocida = MARCAS.find(([re]) => re.test(nombre.trim()));
  return conocida ? conocida[1] : nombre.trim().split(/\s+/)[0] || "Otros";
}

export async function listarCatalogos(): Promise<Catalogo[]> {
  const { data } = await clienteServidor().from("catalogos").select("nombre, archivo, paginas, estado").order("nombre");
  return (data ?? []).map((c) => ({ ...c, marca: marcaDeCatalogo(c.nombre) }));
}

// Cuántos PN tiene cargados cada catálogo.
export async function contarPn(nombres: string[]): Promise<Map<string, number>> {
  const supabase = clienteServidor();
  const cuentas = await Promise.all(
    nombres.map(async (n) => {
      const { count } = await supabase.from("catalogo_pn").select("id", { count: "exact", head: true }).eq("catalogo", n);
      return [n, count ?? 0] as const;
    }),
  );
  return new Map(cuentas);
}

export const POR_PAGINA = 100;

// Las filas de un catálogo en el orden del manual, de a 100.
export async function filasDeCatalogo(nombre: string, pagina: number): Promise<FilaCatalogo[]> {
  const desde = (pagina - 1) * POR_PAGINA;
  const { data } = await clienteServidor()
    .from("catalogo_pn")
    .select(COLUMNAS)
    .eq("catalogo", nombre)
    .order("pagina")
    .order("id")
    .range(desde, desde + POR_PAGINA - 1);
  return (data ?? []) as FilaCatalogo[];
}

// Link firmado por una hora al PDF del catálogo (el bucket es privado).
export async function urlCatalogo(archivo: string): Promise<string | null> {
  const { data } = await clienteServidor().storage.from(BUCKET_CATALOGOS).createSignedUrl(archivo, 3600);
  return data?.signedUrl ?? null;
}

export function linkPagina(f: Pick<FilaCatalogo, "archivo" | "pagina" | "pn">): string {
  return `/catalogo/ver?archivo=${encodeURIComponent(f.archivo)}&pagina=${f.pagina ?? 1}&pn=${encodeURIComponent(f.pn)}`;
}
