import { notFound, redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import type { Servicio } from "@/lib/servicios";
import { FormularioServicio, leerFormularioServicio } from "../formulario";
import { BotonBorrar } from "./boton-borrar";

export default async function EditarServicio({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const supabase = clienteServidor();
  const [s, p] = await Promise.all([
    supabase.from("servicios").select("*").eq("id", id).maybeSingle(),
    supabase.from("proveedores").select("id, empresa, pais").order("empresa").limit(2000),
  ]);
  if (!s.data) notFound();
  const servicio = s.data as Servicio;

  async function guardar(form: FormData) {
    "use server";
    const { error } = await clienteServidor().from("servicios").update(leerFormularioServicio(form)).eq("id", id);
    if (error) throw error;
    redirect("/servicios");
  }

  async function borrar() {
    "use server";
    const { error } = await clienteServidor().from("servicios").delete().eq("id", id);
    if (error) throw error;
    redirect("/servicios");
  }

  return (
    <div className="tarjeta space-y-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="subtitulo text-amarillo">Servicio #{servicio.id}</p>
          <h1 className="titulo mt-1">Editar servicio</h1>
          {servicio.origen && (
            <p className="mt-1 text-sm secundario">
              Cargado desde: {servicio.origen}
              {servicio.presupuesto_id && ` · presupuesto #${servicio.presupuesto_id}`}
            </p>
          )}
        </div>
        <form action={borrar}>
          <BotonBorrar />
        </form>
      </div>
      <FormularioServicio accion={guardar} proveedores={p.data ?? []} servicio={servicio} boton="Guardar cambios" />
    </div>
  );
}
