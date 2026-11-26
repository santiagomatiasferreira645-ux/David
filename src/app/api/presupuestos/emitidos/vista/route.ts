import { NextResponse } from "next/server";
import { validar, type PresupuestoEmitido } from "@/lib/presupuesto-emitido";
import { armarPdf } from "@/lib/presupuesto-emitido-datos";
import { clienteServidor } from "@/lib/supabase/servidor";

// Vista previa del PDF con lo que hay en el formulario, sin guardarlo.
export async function POST(request: Request) {
  const { data: sesion } = await clienteServidor().auth.getUser();
  if (!sesion.user) return NextResponse.json({ error: "Iniciá sesión." }, { status: 401 });
  const v = validar((await request.json()) as PresupuestoEmitido);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const { pdf, nombre } = await armarPdf(v.datos, new URL(request.url).origin);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombre}"`, "Cache-Control": "no-store" },
  });
}
