import Link from "next/link";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

// Alta manual de un PN: siempre queda asociado a un proveedor (como consulta, sin precio).
export default async function NuevoRepuesto({ searchParams }: { searchParams: { proveedor?: string } }) {
  const { data: proveedores } = await clienteServidor().from("proveedores").select("id, empresa, pais").order("empresa").limit(2000);

  async function guardar(form: FormData) {
    "use server";
    const txt = (k: string) => String(form.get(k) ?? "").trim() || null;
    const pn = txt("pn")!;
    const { error } = await clienteServidor().from("consultas_pn").insert({
      proveedor_id: txt("proveedor"),
      pn,
      marca: txt("marca"),
      descripcion: txt("descripcion"),
      modelo_motor: txt("modelo_motor"),
      fecha: txt("fecha"),
    });
    if (error) throw error;
    redirect(`/repuestos?q=${encodeURIComponent(pn)}`);
  }

  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <form action={guardar} className="tarjeta space-y-5 p-5 sm:p-6">
      <div>
        <p className="subtitulo text-amarillo">Repuestos</p>
        <h1 className="titulo mt-1">Agregar un PN</h1>
        <p className="mt-1 text-sm secundario">El PN queda registrado con el proveedor que lo maneja. Si ya tenés el precio, usá Cargar precio.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="proveedor">Proveedor</label>
          <select id="proveedor" name="proveedor" required defaultValue={searchParams.proveedor ?? ""} className="campo">
            <option value="" disabled>Elegir proveedor</option>
            {(proveedores ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.empresa} {p.pais && `(${p.pais})`}
              </option>
            ))}
          </select>
          <Link href="/proveedores/nuevo" className="enlace mt-1 inline-block text-sm">
            ¿No está? Dar de alta un proveedor
          </Link>
        </div>
        <Campo nombre="pn" texto="PN" requerido />
        <Campo nombre="marca" texto="Marca" />
        <div className="sm:col-span-2">
          <Campo nombre="descripcion" texto="Descripción" />
        </div>
        <Campo nombre="modelo_motor" texto="Modelo de motor o reductor" />
        <Campo nombre="fecha" texto="Fecha" tipo="date" valor={hoy} />
      </div>
      <button className="boton">Guardar PN</button>
    </form>
  );
}

function Campo(p: { nombre: string; texto: string; tipo?: string; valor?: string; requerido?: boolean }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <input id={p.nombre} name={p.nombre} type={p.tipo ?? "text"} defaultValue={p.valor} required={p.requerido} className="campo" />
    </div>
  );
}
