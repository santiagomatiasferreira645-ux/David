"use server";

import type { SugerenciaIA } from "@/lib/ia";
import { nombrePrincipal } from "@/lib/marcas";
import { normalizarTelefono } from "@/lib/pn";
import { clienteServidor } from "@/lib/supabase/servidor";

// Pasa un proveedor sugerido por la IA a la base propia, con su contacto. Devuelve el id nuevo (P0078...).
export async function agregarProveedorIA(s: SugerenciaIA, marca: string): Promise<{ id?: string; error?: string }> {
  const supabase = clienteServidor();
  const { data: existente } = await supabase.from("proveedores").select("id").ilike("empresa", s.empresa.replace(/[%_]/g, " ")).maybeSingle();
  if (existente) return { id: existente.id };

  for (let intento = 0; intento < 3; intento++) {
    const { data: ultimo } = await supabase.from("proveedores").select("id").like("id", "P%").order("id", { ascending: false }).limit(1).maybeSingle();
    const numero = Number(ultimo?.id?.slice(1) ?? 0) + 1 + intento;
    const id = `P${String(numero).padStart(4, "0")}`;
    const { error } = await supabase.from("proveedores").insert({
      id,
      empresa: s.empresa,
      pais: s.pais,
      ciudad: s.ciudad,
      marcas: marca ? nombrePrincipal(marca) : null,
      tipo: s.tipo,
      web: s.web,
      origen: "Búsqueda con IA",
      notas: `${s.motivo} Fuente: ${s.fuente}`,
    });
    if (error?.code === "23505") continue; // otro usuario tomó el mismo id al mismo tiempo
    if (error) return { error: error.message };

    const telefono = normalizarTelefono(s.whatsapp) || normalizarTelefono(s.telefono) || s.telefono;
    if (s.email || telefono) {
      await supabase.from("contactos").insert({
        proveedor_id: id,
        nombre: "Ventas",
        email: s.email,
        telefono,
        tiene_whatsapp: s.whatsapp ? "Sí" : "No sé",
        origen: "Búsqueda con IA",
      });
    }
    return { id };
  }
  return { error: "No se pudo asignar un número de proveedor. Probá de nuevo." };
}
