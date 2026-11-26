import "server-only";
import { buscarPorNombre } from "@/lib/presupuestos";
import {
  categoriaServicio,
  condiciones,
  esMembrete,
  esModelo,
  MEMBRETES,
  MONEDA,
  nombreArchivo,
  nuevoPresupuesto,
  numeroSiguiente,
  totales,
  type Membrete,
  type PresupuestoEmitido,
} from "@/lib/presupuesto-emitido";
import { generarPresupuestoPdf, type LogosMembrete } from "@/lib/presupuesto-emitido-pdf";
import { clienteServidor } from "@/lib/supabase/servidor";

const LOGOS: Record<Membrete, { principal: string; secundario?: string }> = {
  daysa: { principal: "/logos/daysa-membrete.jpg" },
  "tecnica-naval": { principal: "/logos/emd.png", secundario: "/logos/tecnica-naval-membrete.jpg" },
};

type FilaItem = {
  clase: string;
  pn: string | null;
  descripcion: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  orden: number | null;
  id: number;
};

// Lee un presupuesto emitido con sus renglones, en el orden en que se cargaron.
export async function leerEmitido(id: number): Promise<PresupuestoEmitido | null> {
  const supabase = clienteServidor();
  const [{ data: p }, { data: filas }] = await Promise.all([
    supabase.from("presupuestos").select("*").eq("id", id).eq("origen", "emitido").maybeSingle(),
    supabase.from("presupuesto_items").select("id, clase, pn, descripcion, cantidad, precio_unitario, orden").eq("presupuesto_id", id),
  ]);
  if (!p) return null;
  const items = ((filas ?? []) as FilaItem[]).sort((a, b) => (a.orden ?? a.id) - (b.orden ?? b.id) || a.id - b.id);
  const base = nuevoPresupuesto();
  return {
    id: p.id,
    membrete: esMembrete(p.membrete) ? p.membrete : "daysa",
    modelo: esModelo(p.modelo) ? p.modelo : "repuestos",
    numero: p.numero ?? "",
    fecha: p.fecha ?? base.fecha,
    lugar: p.lugar_emision ?? "",
    cliente: p.cliente ?? "",
    atencion: p.atencion ?? "",
    referencia: p.referencia ?? "",
    referencia_detalle: p.referencia_detalle ?? "",
    renglones: items
      .filter((i) => i.clase === "repuesto")
      .map((i) => ({ pn: i.pn ?? "", descripcion: i.descripcion ?? "", cantidad: i.cantidad, precio: i.precio_unitario })),
    detalles: items.filter((i) => i.clase === "servicio").map((i) => ({ descripcion: i.descripcion ?? "", precio: i.precio_unitario })),
    entrega_dias: p.entrega_dias,
    plazo_pago: p.plazo_pago ?? "",
    oferta_dias: p.oferta_dias,
    aclaraciones: p.aclaraciones ?? "",
    lugar_entrega: p.lugar_entrega ?? "",
  };
}

// Número sugerido para el próximo presupuesto de cada empresa.
export async function numerosSugeridos(): Promise<Record<Membrete, string>> {
  const { data } = await clienteServidor().from("presupuestos").select("membrete, numero").eq("origen", "emitido").order("id", { ascending: false }).limit(500);
  const filas = (data ?? []) as { membrete: string | null; numero: string | null }[];
  const anio = String(new Date().getFullYear()).slice(-2);
  const de = (m: Membrete) =>
    numeroSiguiente(
      filas.filter((f) => f.membrete === m && f.numero?.trim().endsWith(anio)).map((f) => f.numero),
      m,
    );
  return { daysa: de("daysa"), "tecnica-naval": de("tecnica-naval") };
}

// Nombres de clientes para sugerir al escribir: los de la base de clientes (si existe) y los de presupuestos anteriores.
export async function nombresClientes(): Promise<string[]> {
  const supabase = clienteServidor();
  const [clientes, previos] = await Promise.all([
    supabase.from("clientes").select("empresa").limit(5000),
    supabase.from("presupuestos").select("cliente").eq("tipo", "propio").not("cliente", "is", null).limit(5000),
  ]);
  const nombres = [
    ...((clientes.error ? [] : (clientes.data ?? [])) as { empresa: string }[]).map((c) => c.empresa),
    ...((previos.data ?? []) as { cliente: string }[]).map((c) => c.cliente),
  ];
  return Array.from(new Set(nombres.map((n) => n?.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"));
}

// Guarda (alta o edición) un presupuesto ya validado. Queda junto a los históricos, como presupuesto propio, y sus
// renglones de mano de obra o servicio pasan también al módulo de Servicios.
export async function guardarEmitido(p: PresupuestoEmitido): Promise<{ id: number } | { error: string }> {
  const supabase = clienteServidor();
  const m = MEMBRETES[p.membrete];
  const t = totales(p);

  const clientes = await supabase.from("clientes").select("id, empresa").limit(5000);
  const cliente = clientes.error
    ? null
    : buscarPorNombre(
        ((clientes.data ?? []) as { id: string; empresa: string }[]).map((c) => ({ id: c.id, nombre: c.empresa })),
        p.cliente,
      );

  const encabezado = {
    tipo: "propio",
    origen: "emitido",
    estado: "listo",
    error: null,
    empresa: m.nombre,
    membrete: p.membrete,
    modelo: p.modelo,
    numero: p.numero || null,
    fecha: p.fecha,
    lugar_emision: p.lugar || null,
    cliente: p.cliente,
    cliente_id: cliente?.id ?? null,
    atencion: p.atencion || null,
    referencia: p.referencia || null,
    referencia_detalle: p.referencia_detalle || null,
    moneda: MONEDA,
    total: t.total,
    entrega_dias: p.entrega_dias,
    plazo_pago: p.plazo_pago || null,
    oferta_dias: p.oferta_dias,
    aclaraciones: p.aclaraciones || null,
    lugar_entrega: p.lugar_entrega || null,
    condiciones: condiciones(p)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · "),
  };

  let id = p.id;
  if (id) {
    const { error } = await supabase.from("presupuestos").update(encabezado).eq("id", id).eq("origen", "emitido");
    if (error) return { error: mensajeError(error.message) };
    await supabase.from("presupuesto_items").delete().eq("presupuesto_id", id);
  } else {
    const { data, error } = await supabase.from("presupuestos").insert(encabezado).select("id").single();
    if (error || !data) return { error: mensajeError(error?.message ?? "No se pudo guardar.") };
    id = data.id as number;
  }

  const renglones = [
    ...p.renglones.map((r, i) => ({
      presupuesto_id: id,
      clase: "repuesto",
      orden: i,
      pn: r.pn || null,
      descripcion: r.descripcion || null,
      cantidad: r.cantidad,
      precio_unitario: r.precio,
      moneda: MONEDA,
    })),
    ...p.detalles.map((d, i) => ({
      presupuesto_id: id,
      clase: "servicio",
      orden: 1000 + i,
      descripcion: d.descripcion,
      cantidad: 1,
      unidad: "servicio",
      precio_unitario: d.precio,
      moneda: MONEDA,
    })),
  ];
  if (renglones.length) {
    const { error } = await supabase.from("presupuesto_items").insert(renglones);
    if (error) return { error: mensajeError(error.message) };
  }

  // Módulo de Servicios: se reemplazan los renglones de este presupuesto. Si la tabla no existe, no pasa nada.
  const borrado = await supabase.from("servicios").delete().eq("presupuesto_id", id);
  if (!borrado.error && p.detalles.length) {
    await supabase.from("servicios").insert(
      p.detalles.map((d) => ({
        prestador: "propio",
        categoria: categoriaServicio(d.descripcion, p.modelo),
        descripcion: d.descripcion,
        cliente: p.cliente,
        cliente_id: cliente?.id ?? null,
        lugar: p.lugar_entrega || null,
        fecha: p.fecha,
        cantidad: 1,
        unidad: "servicio",
        precio: d.precio,
        moneda: MONEDA,
        estado: "presupuestado",
        presupuesto_id: id,
        origen: "Emitir presupuesto",
        notas: [m.nombre, p.numero && `Presupuesto N° ${p.numero}`].filter(Boolean).join(" · "),
      })),
    );
  }
  return { id: id! };
}

const mensajeError = (m: string) =>
  /column .* does not exist|could not find the .* column|null value in column "archivo"/i.test(m)
    ? "Falta preparar la base: ejecutá en Supabase la migración 0012_presupuestos_emitidos.sql."
    : m;

async function leerLogo(ruta: string | undefined, origen: string): Promise<Uint8Array | null> {
  if (!ruta) return null;
  try {
    const r = await fetch(new URL(ruta, origen));
    return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

// PDF del presupuesto con el membrete de su empresa. `origen` es la dirección de la app, para leer los logos.
export async function armarPdf(p: PresupuestoEmitido, origen: string): Promise<{ pdf: Uint8Array; nombre: string }> {
  const l = LOGOS[p.membrete];
  const logos: LogosMembrete = { principal: await leerLogo(l.principal, origen), secundario: await leerLogo(l.secundario, origen) };
  return { pdf: await generarPresupuestoPdf(p, logos), nombre: nombreArchivo(p) };
}
