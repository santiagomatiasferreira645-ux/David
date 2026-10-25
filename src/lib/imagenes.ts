import { normalizarPn } from "./pn";
import { clienteServidor } from "./supabase/servidor";

export const BUCKET_IMAGENES = "imagenes-pn";

export type ImagenPn = { ruta: string; url: string };

// Fotos de referencia del PN, con links firmados por una hora (el bucket es privado).
export async function imagenesDelPn(pn: string): Promise<ImagenPn[]> {
  const carpeta = normalizarPn(pn);
  if (!carpeta) return [];
  const storage = clienteServidor().storage.from(BUCKET_IMAGENES);
  const { data: archivos } = await storage.list(carpeta, { sortBy: { column: "created_at", order: "desc" } });
  const rutas = (archivos ?? []).filter((a) => a.id).map((a) => `${carpeta}/${a.name}`);
  if (!rutas.length) return [];
  const { data: firmadas } = await storage.createSignedUrls(rutas, 3600);
  return (firmadas ?? []).filter((f) => f.signedUrl && f.path).map((f) => ({ ruta: f.path!, url: f.signedUrl }));
}
