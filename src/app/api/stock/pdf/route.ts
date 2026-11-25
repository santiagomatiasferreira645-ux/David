import { NextResponse } from "next/server";
import { armarListado } from "@/lib/stock-listado";

// Listado de stock en PDF para ver o descargar: mismas opciones que el formulario de Stock > Listado PDF.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const listado = await armarListado(url.searchParams, url.origin);
  if (typeof listado === "string") return NextResponse.json({ error: listado }, { status: 400 });
  return new NextResponse(Buffer.from(listado.pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${listado.nombre}"`, "Cache-Control": "no-store" },
  });
}
