import { NextResponse } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

const CANALES = ["WhatsApp", "Llamada", "Email"];

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  if (!b || !CANALES.includes(b.canal)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { error } = await clienteServidor().from("contactos_realizados").insert({
    busqueda_id: Number(b.busquedaId) || null,
    contacto_id: Number(b.contactoId) || null,
    proveedor_id: typeof b.proveedorId === "string" ? b.proveedorId : null,
    canal: b.canal,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
