import type { SupabaseClient } from "@supabase/supabase-js";
import type { Proveedor } from "./tipos";

type DatosProveedor = Partial<Omit<Proveedor, "id">> & { empresa: string };

// Inserta un proveedor con el próximo número libre (P0078...). Si ya hay uno con el mismo nombre, devuelve ese.
export async function crearProveedor(supabase: SupabaseClient, datos: DatosProveedor): Promise<{ id?: string; existente?: boolean; error?: string }> {
  const { data: existente } = await supabase.from("proveedores").select("id").ilike("empresa", datos.empresa.replace(/[%_]/g, " ")).maybeSingle();
  if (existente) return { id: existente.id, existente: true };

  for (let intento = 0; intento < 3; intento++) {
    const { data: ultimo } = await supabase.from("proveedores").select("id").like("id", "P%").order("id", { ascending: false }).limit(1).maybeSingle();
    const numero = Number(ultimo?.id?.slice(1) ?? 0) + 1 + intento;
    const id = `P${String(numero).padStart(4, "0")}`;
    const { error } = await supabase.from("proveedores").insert({ ...datos, id });
    if (error?.code === "23505") continue; // otro usuario tomó el mismo id al mismo tiempo
    if (error) return { error: error.message };
    return { id };
  }
  return { error: "No se pudo asignar un número de proveedor. Probá de nuevo." };
}
