import { NextResponse } from "next/server";
import { armarPdf, leerEmitido } from "@/lib/presupuesto-emitido-datos";

// PDF de un presupuesto emitido, para ver, descargar o compartir.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const p = await leerEmitido(Number(params.id));
  if (!p) return NextResponse.json({ error: "No se encontró el presupuesto." }, { status: 404 });
  const { pdf, nombre } = await armarPdf(p, new URL(request.url).origin);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombre}"`, "Cache-Control": "no-store" },
  });
}
