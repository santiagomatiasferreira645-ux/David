import { NextResponse } from "next/server";
import { buscarProveedoresIA, MODELO_IA, type SugerenciaIA } from "@/lib/ia";
import { coincideMarca, variantesMarca } from "@/lib/marcas";
import { normalizarPn } from "@/lib/pn";
import { clienteServidor } from "@/lib/supabase/servidor";

// La búsqueda web puede tardar; 60 segundos es el máximo que admite el plan gratuito de Vercel.
export const maxDuration = 60;

const DIAS_VIGENCIA = 30;

export async function POST(request: Request) {
  const { busquedaId, forzar } = (await request.json()) as { busquedaId: number; forzar?: boolean };
  const supabase = clienteServidor();
  const { data: busqueda } = await supabase.from("busquedas").select("*").eq("id", busquedaId).maybeSingle();
  if (!busqueda) return NextResponse.json({ error: "No se encontró la búsqueda." }, { status: 404 });

  // Si el mismo PN y marca se buscó con IA hace poco, se reutiliza el resultado en vez de pagar otra consulta.
  if (!forzar) {
    const desde = new Date(Date.now() - DIAS_VIGENCIA * 86400000).toISOString();
    const { data: previas } = await supabase
      .from("sugerencias_ia")
      .select("proveedores, marca, creado_en")
      .eq("pn_normalizado", normalizarPn(busqueda.pn))
      .gte("creado_en", desde)
      .order("creado_en", { ascending: false })
      .limit(10);
    const previa = (previas ?? []).find((p) => !busqueda.marca || coincideMarca(p.marca, busqueda.marca));
    if (previa) return NextResponse.json({ proveedores: previa.proveedores as SugerenciaIA[], fecha: previa.creado_en, guardada: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "falta_clave" }, { status: 503 });
  }

  let conocidos: string[] = [];
  if (busqueda.marca) {
    const { data } = await supabase
      .from("proveedores")
      .select("empresa, marcas")
      .or(variantesMarca(busqueda.marca).map((v) => `marcas.ilike.%${v.replace(/[%,()*]/g, " ")}%`).join(","))
      .limit(200);
    conocidos = (data ?? []).filter((p) => coincideMarca(p.marcas, busqueda.marca)).map((p) => p.empresa);
  }

  try {
    const proveedores = await buscarProveedoresIA({ pn: busqueda.pn, marca: busqueda.marca ?? "", cantidad: busqueda.cantidad, conocidos });
    const { data: fila } = await supabase
      .from("sugerencias_ia")
      .insert({ busqueda_id: busqueda.id, pn: busqueda.pn, marca: busqueda.marca, proveedores, modelo: MODELO_IA })
      .select("creado_en")
      .single();
    return NextResponse.json({ proveedores, fecha: fila?.creado_en ?? new Date().toISOString(), guardada: false });
  } catch (e) {
    console.error("Búsqueda con IA:", e);
    return NextResponse.json({ error: "La búsqueda con IA falló. Probá de nuevo en unos minutos." }, { status: 502 });
  }
}
