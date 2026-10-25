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
export async function buscarEnCatalogo(texto: string): Promise<FilaCatalogo[]> {
  const q = texto.trim();
  if (!q) return [];
  let consulta = clienteServidor().from("catalogo_pn").select(COLUMNAS);
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

export async function listarCatalogos(): Promise<{ nombre: string; estado: string }[]> {
  const { data } = await clienteServidor().from("catalogos").select("nombre, estado").order("creado_en");
  return data ?? [];
}

// Link firmado por una hora al PDF del catálogo (el bucket es privado).
export async function urlCatalogo(archivo: string): Promise<string | null> {
  const { data } = await clienteServidor().storage.from(BUCKET_CATALOGOS).createSignedUrl(archivo, 3600);
  return data?.signedUrl ?? null;
}

export function linkPagina(f: Pick<FilaCatalogo, "archivo" | "pagina" | "pn">): string {
  return `/catalogo/ver?archivo=${encodeURIComponent(f.archivo)}&pagina=${f.pagina ?? 1}&pn=${encodeURIComponent(f.pn)}`;
}
