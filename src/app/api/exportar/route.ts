import { NextResponse } from "next/server";
import { buscar, obtenerBusqueda } from "@/lib/datos";
import { generarExcel } from "@/lib/excel";

export async function GET(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  const busqueda = id ? await obtenerBusqueda(id) : null;
  if (!busqueda) return NextResponse.json({ error: "Búsqueda no encontrada" }, { status: 404 });

  const marca = busqueda.marca ?? "";
  const resultados = await buscar(busqueda.pn, marca);
  const archivo = await generarExcel({ pn: busqueda.pn, marca, cantidad: busqueda.cantidad, resultados });
  const nombre = `busqueda_${busqueda.pn.replace(/[^A-Za-z0-9]/g, "")}_${busqueda.creado_en.slice(0, 10)}.xlsx`;
  return new NextResponse(archivo, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
