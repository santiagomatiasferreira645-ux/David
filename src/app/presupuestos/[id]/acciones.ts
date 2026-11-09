"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fechaValida, monedaValida } from "@/lib/presupuestos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { borrarPresupuestos } from "../acciones";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;
const numero = (f: FormData, k: string) => {
  const t = String(f.get(k) ?? "").trim().replace(",", ".");
  return t && Number.isFinite(Number(t)) ? Number(t) : null;
};

export async function guardarEncabezado(id: number, f: FormData) {
  const tipo = texto(f, "tipo");
  await clienteServidor()
    .from("presupuestos")
    .update({
      tipo: tipo === "propio" || tipo === "proveedor" ? tipo : null,
      fecha: fechaValida(texto(f, "fecha")),
      numero: texto(f, "numero"),
      cliente: texto(f, "cliente"),
      proveedor_nombre: texto(f, "proveedor_nombre"),
      moneda: monedaValida(texto(f, "moneda")),
      notas: texto(f, "notas"),
    })
    .eq("id", id);
  revalidatePath(`/presupuestos/${id}`);
}

export async function guardarItem(presupuestoId: number, itemId: number, f: FormData) {
  const clase = texto(f, "clase") === "servicio" ? "servicio" : "repuesto";
  await clienteServidor()
    .from("presupuesto_items")
    .update({
      clase,
      pn: texto(f, "pn"),
      marca: texto(f, "marca"),
      descripcion: texto(f, "descripcion"),
      cantidad: numero(f, "cantidad"),
      precio_unitario: numero(f, "precio_unitario"),
      moneda: monedaValida(texto(f, "moneda")),
    })
    .eq("id", itemId)
    .eq("presupuesto_id", presupuestoId);
  revalidatePath(`/presupuestos/${presupuestoId}`);
}

export async function borrarItem(presupuestoId: number, itemId: number) {
  await clienteServidor().from("presupuesto_items").delete().eq("id", itemId).eq("presupuesto_id", presupuestoId);
  revalidatePath(`/presupuestos/${presupuestoId}`);
}

export async function borrarPresupuesto(id: number) {
  await borrarPresupuestos([id]);
  redirect("/presupuestos");
}
