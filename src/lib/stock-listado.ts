import "server-only";
import { listarDepositos } from "@/lib/stock-datos";
import { generarListadoPdf, type RenglonListado, type SeccionListado } from "@/lib/stock-pdf";
import { clienteServidor } from "@/lib/supabase/servidor";

// Con qué empresa del grupo sale el listado (logo y nombre arriba).
const EMPRESAS: Record<string, { nombre: string; logo: string }> = {
  daysa: { nombre: "DAYSA", logo: "/logos/daysa.png" },
  "tecnica-naval": { nombre: "Técnica Naval y Servicios", logo: "/logos/tecnica-naval.png" },
  spes: { nombre: "SPES Supplier", logo: "/logos/spes.png" },
};

type Fila = {
  deposito_id: number;
  cantidad: number;
  stock_articulos: { pn: string; marca: string | null; descripcion: string | null; condicion: string; precio_venta: number | null; moneda: string } | null;
};

export type Listado = { pdf: Uint8Array; nombre: string; titulo: string; empresa: string };

// Listado de stock en PDF para mandar a clientes, con las opciones del formulario:
// deposito=<id> (o sin él, todos), precios=1 para incluir el precio de referencia, marca y empresa.
// `origen` es la dirección de la app, para leer el logo. Devuelve un texto si hay un error.
export async function armarListado(params: URLSearchParams, origen: string): Promise<Listado | string> {
  const depositoId = Number(params.get("deposito")) || null;
  const conPrecios = params.get("precios") === "1";
  const marca = params.get("marca")?.trim().toLowerCase() || null;
  const empresa = EMPRESAS[params.get("empresa") ?? ""] ?? EMPRESAS.daysa;

  const depositos = await listarDepositos();
  const elegido = depositoId ? depositos.find((d) => d.id === depositoId) : null;
  if (depositoId && !elegido) return "Depósito no encontrado";

  let consulta = clienteServidor()
    .from("stock_existencias")
    .select("deposito_id, cantidad, stock_articulos (pn, marca, descripcion, condicion, precio_venta, moneda)")
    .gt("cantidad", 0)
    .limit(20000);
  if (depositoId) consulta = consulta.eq("deposito_id", depositoId);
  const { data, error } = await consulta;
  if (error) return error.message;

  const porDeposito = new Map<number, RenglonListado[]>();
  for (const f of (data ?? []) as unknown as Fila[]) {
    const a = f.stock_articulos;
    if (!a || (marca && (a.marca ?? "").toLowerCase() !== marca)) continue;
    const lista = porDeposito.get(f.deposito_id) ?? [];
    lista.push({ pn: a.pn, marca: a.marca, descripcion: a.descripcion, condicion: a.condicion, cantidad: Number(f.cantidad), precio: a.precio_venta, moneda: a.moneda });
    porDeposito.set(f.deposito_id, lista);
  }
  const secciones: SeccionListado[] = (elegido ? [elegido] : depositos)
    .filter((d) => porDeposito.has(d.id))
    .map((d) => ({
      deposito: d.nombre,
      ubicacion: d.ubicacion,
      renglones: porDeposito.get(d.id)!.sort((x, y) => (x.marca ?? "").localeCompare(y.marca ?? "") || x.pn.localeCompare(y.pn)),
    }));

  let logo: Uint8Array | null = null;
  try {
    const r = await fetch(new URL(empresa.logo, origen));
    if (r.ok) logo = new Uint8Array(await r.arrayBuffer());
  } catch {
    logo = null;
  }

  const hoy = new Date();
  const fecha = hoy.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
  const titulo = elegido ? `Stock disponible · ${elegido.nombre}` : "Stock disponible";
  const pdf = await generarListadoPdf(secciones, { titulo, fecha, conPrecios, logo, empresa: empresa.nombre });
  const nombre = `stock_${(elegido?.nombre ?? "todos").normalize("NFD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}_${hoy.toISOString().slice(0, 10)}.pdf`;
  return { pdf, nombre, titulo, empresa: empresa.nombre };
}
