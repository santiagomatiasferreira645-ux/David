"use server";

import { revalidatePath } from "next/cache";
import { validar, type PresupuestoEmitido } from "@/lib/presupuesto-emitido";
import { guardarEmitido } from "@/lib/presupuesto-emitido-datos";

export async function guardarPresupuesto(datos: PresupuestoEmitido): Promise<{ id: number } | { error: string }> {
  const v = validar(datos);
  if (!v.ok) return { error: v.error };
  const r = await guardarEmitido(v.datos);
  if ("id" in r) {
    revalidatePath("/presupuestos");
    revalidatePath(`/presupuestos/${r.id}`);
  }
  return r;
}
