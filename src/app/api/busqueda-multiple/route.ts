import { NextResponse } from "next/server";
import { MAX_PN, resumirPn } from "@/lib/multiple";

// Resumen de una lista de PN pedida por un cliente (búsqueda múltiple).
export async function POST(request: Request) {
  const { pns } = (await request.json()) as { pns: string[] };
  if (!Array.isArray(pns) || !pns.length || pns.length > MAX_PN || !pns.every((p) => typeof p === "string")) {
    return NextResponse.json({ error: `Mandá entre 1 y ${MAX_PN} PN.` }, { status: 400 });
  }
  try {
    return NextResponse.json({ resultados: await resumirPn(pns) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
