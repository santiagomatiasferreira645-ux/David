import { NextResponse } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) await clienteServidor().auth.exchangeCodeForSession(code);
  // Solo rutas internas, para que el link no pueda mandar a otro sitio.
  const siguiente = url.searchParams.get("siguiente") ?? "/";
  const destino = siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/";
  return NextResponse.redirect(new URL(destino, url.origin));
}
