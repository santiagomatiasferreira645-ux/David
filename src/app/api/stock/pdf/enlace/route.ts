import { NextResponse } from "next/server";
import { armarListado } from "@/lib/stock-listado";
import { clienteServidor } from "@/lib/supabase/servidor";

const BUCKET_LISTADOS = "listados";
const VALIDEZ_SEGUNDOS = 7 * 24 * 3600;

// Guarda el listado en Storage y devuelve un link que el cliente abre sin sesión, válido 7 días.
// Se usa para mandarlo por WhatsApp o mail cuando el teléfono no puede compartir el archivo directo.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const params = new URLSearchParams((await request.json()) as Record<string, string>);
  const listado = await armarListado(params, url.origin);
  if (typeof listado === "string") return NextResponse.json({ error: listado }, { status: 400 });

  const storage = clienteServidor().storage.from(BUCKET_LISTADOS);
  const ruta = `stock/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${listado.nombre}`;
  const subida = await storage.upload(ruta, listado.pdf, { contentType: "application/pdf" });
  if (subida.error) {
    const falta = /bucket not found/i.test(subida.error.message);
    return NextResponse.json(
      { error: falta ? "Falta crear el espacio de listados en Supabase (0011_listados.sql)." : subida.error.message },
      { status: 500 },
    );
  }
  const { data, error } = await storage.createSignedUrl(ruta, VALIDEZ_SEGUNDOS, { download: listado.nombre });
  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo crear el link." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, nombre: listado.nombre, titulo: listado.titulo, empresa: listado.empresa });
}
