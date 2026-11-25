import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { FormularioServicio, leerFormularioServicio } from "../formulario";

export default async function NuevoServicio({ searchParams }: { searchParams: { proveedor?: string } }) {
  const { data: proveedores } = await clienteServidor().from("proveedores").select("id, empresa, pais").order("empresa").limit(2000);

  async function guardar(form: FormData) {
    "use server";
    const datos = leerFormularioServicio(form);
    const { error } = await clienteServidor().from("servicios").insert({ ...datos, origen: "App" });
    if (error) throw error;
    redirect(`/servicios?q=${encodeURIComponent(datos.descripcion.split(/\s+/).slice(0, 2).join(" "))}`);
  }

  return (
    <div className="tarjeta space-y-5 p-5 sm:p-6">
      <div>
        <p className="subtitulo text-amarillo">Servicios</p>
        <h1 className="titulo mt-1">Cargar un servicio presupuestado</h1>
        <p className="mt-1 text-sm secundario">Queda como precio de referencia para la próxima consulta de un cliente.</p>
      </div>
      <FormularioServicio
        accion={guardar}
        proveedores={proveedores ?? []}
        servicio={searchParams.proveedor ? { prestador: "proveedor", proveedor_id: searchParams.proveedor } : undefined}
        boton="Guardar servicio"
      />
    </div>
  );
}
