"use server";

import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

// Borra presupuestos con sus renglones, su archivo en Storage y los servicios que se pasaron al módulo de Servicios.
export async function borrarPresupuestos(ids: number[]): Promise<{ borrados: number; error?: string }> {
  const validos = ids.filter((id) => Number.isInteger(id) && id > 0);
  const supabase = clienteServidor();
  let borrados = 0;
  for (let i = 0; i < validos.length; i += 200) {
    const tanda = validos.slice(i, i + 200);
    const { data } = await supabase.from("presupuestos").select("id, archivo").in("id", tanda);
    if (!data?.length) continue;
    await supabase.from("servicios").delete().in("presupuesto_id", tanda); // si la tabla no existe, no pasa nada
    await supabase.storage.from("presupuestos").remove(data.map((p) => p.archivo));
    const { error } = await supabase.from("presupuestos").delete().in("id", tanda);
    if (error) return { borrados, error: error.message };
    borrados += data.length;
  }
  revalidatePath("/presupuestos");
  return { borrados };
}
