"use server";

import type { SugerenciaIA } from "@/lib/ia";
import { nombrePrincipal } from "@/lib/marcas";
import { normalizarTelefono } from "@/lib/pn";
import { crearProveedor } from "@/lib/proveedores";
import { clienteServidor } from "@/lib/supabase/servidor";

// Pasa un proveedor sugerido por la IA a la base propia, con su contacto. Devuelve el id nuevo (P0078...).
export async function agregarProveedorIA(s: SugerenciaIA, marca: string): Promise<{ id?: string; error?: string }> {
  const supabase = clienteServidor();
  const r = await crearProveedor(supabase, {
    empresa: s.empresa,
    pais: s.pais,
    ciudad: s.ciudad,
    marcas: marca ? nombrePrincipal(marca) : null,
    tipo: s.tipo,
    web: s.web,
    origen: "Búsqueda con IA",
    notas: `${s.motivo} Fuente: ${s.fuente}`,
  });
  if (!r.id || r.existente) return { id: r.id, error: r.error };

  const telefono = normalizarTelefono(s.whatsapp) || normalizarTelefono(s.telefono) || s.telefono;
  if (s.email || telefono) {
    await supabase.from("contactos").insert({
      proveedor_id: r.id,
      nombre: "Ventas",
      email: s.email,
      telefono,
      tiene_whatsapp: s.whatsapp ? "Sí" : "No sé",
      origen: "Búsqueda con IA",
    });
  }
  return { id: r.id };
}
