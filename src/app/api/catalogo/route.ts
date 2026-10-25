import { NextResponse } from "next/server";
import { extraerPaginas, type PaginaTexto } from "@/lib/catalogo-ia";
import { clienteServidor } from "@/lib/supabase/servidor";

// Cada pedido lee unas pocas páginas; 60 segundos es el máximo del plan gratuito de Vercel.
export const maxDuration = 60;

const MAX_CARACTERES = 40000;

// Lee con IA un grupo de páginas de un catálogo y guarda sus PN. El navegador manda las páginas de a tandas.
export async function POST(request: Request) {
  const { catalogoId, paginas } = (await request.json()) as { catalogoId: number; paginas: PaginaTexto[] };
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "Falta la clave de Anthropic en Vercel." }, { status: 503 });
  if (!paginas?.length || paginas.reduce((n, p) => n + p.texto.length, 0) > MAX_CARACTERES) {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const supabase = clienteServidor();
  const { data: catalogo } = await supabase.from("catalogos").select("nombre, archivo").eq("id", catalogoId).maybeSingle();
  if (!catalogo) return NextResponse.json({ error: "No se encontró el catálogo." }, { status: 404 });

  try {
    const filas = await extraerPaginas(catalogo.nombre, paginas);
    if (filas.length) {
      const { error } = await supabase
        .from("catalogo_pn")
        .insert(filas.map((f) => ({ ...f, catalogo: catalogo.nombre, archivo: catalogo.archivo })));
      if (error) throw error;
    }
    return NextResponse.json({ filas: filas.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
