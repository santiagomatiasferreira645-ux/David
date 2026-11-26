import { NextResponse } from "next/server";
import { armarPdf, leerEmitido } from "@/lib/presupuesto-emitido-datos";
import { clienteServidor } from "@/lib/supabase/servidor";

const VALIDEZ_SEGUNDOS = 7 * 24 * 3600;

// Guarda el PDF en Storage (espacio "listados", el mismo de los listados de stock) y devuelve un link que el cliente
// abre sin sesión, válido 7 días. Se usa para mandarlo por WhatsApp o mail.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const p = await leerEmitido(Number(params.id));
  if (!p) return NextResponse.json({ error: "No se encontró el presupuesto." }, { status: 404 });
  const { pdf, nombre } = await armarPdf(p, new URL(request.url).origin);
  const storage = clienteServidor().storage.from("listados");
  const ruta = `presupuestos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nombre}`;
  const subida = await storage.upload(ruta, pdf, { contentType: "application/pdf" });
  if (subida.error) {
    const falta = /bucket not found/i.test(subida.error.message);
    return NextResponse.json({ error: falta ? "Falta crear el espacio de listados en Supabase (0011_listados.sql)." : subida.error.message }, { status: 500 });
  }
  const { data, error } = await storage.createSignedUrl(ruta, VALIDEZ_SEGUNDOS, { download: nombre });
  if (error || !data) return NextResponse.json({ error: error?.message ?? "No se pudo crear el link." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, nombre });
}
