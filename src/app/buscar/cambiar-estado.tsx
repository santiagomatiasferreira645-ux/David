import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";

const ESTADOS = ["abierta", "cotizada", "comprada", "perdida"] as const;

export function CambiarEstado({ id, estado }: { id: number; estado: string }) {
  async function guardar(form: FormData) {
    "use server";
    const nuevo = String(form.get("estado"));
    if (!ESTADOS.includes(nuevo as (typeof ESTADOS)[number])) return;
    await clienteServidor().from("busquedas").update({ estado: nuevo }).eq("id", id);
    revalidatePath("/buscar");
  }
  return (
    <form action={guardar} className="flex gap-1">
      <select name="estado" defaultValue={estado} className="campo w-auto py-1.5 text-sm">
        {ESTADOS.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
      <button className="boton-secundario">Guardar</button>
    </form>
  );
}
