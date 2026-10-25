import Link from "next/link";
import { redirect } from "next/navigation";
import { normalizarTelefono } from "@/lib/pn";
import { crearProveedor } from "@/lib/proveedores";
import { clienteServidor } from "@/lib/supabase/servidor";

const IDIOMAS = ["Español", "Inglés", "Portugués"];
const WHATSAPP = ["No sé", "Sí", "No"];
const CANALES = ["Email", "WhatsApp", "Llamada", "WeChat", "Telegram", "Formulario web"];

export default function NuevoProveedor({ searchParams }: { searchParams: { error?: string; existente?: string } }) {
  async function guardar(form: FormData) {
    "use server";
    const txt = (k: string) => String(form.get(k) ?? "").trim() || null;
    const supabase = clienteServidor();
    const r = await crearProveedor(supabase, {
      empresa: txt("empresa")!,
      pais: txt("pais"),
      ciudad: txt("ciudad"),
      marcas: txt("marcas"),
      tipo: txt("tipo"),
      web: txt("web"),
      idioma: txt("idioma"),
      productos: txt("productos"),
      notas: txt("notas"),
      origen: "App",
    });
    if (r.existente) redirect(`/proveedores/nuevo?existente=${r.id}`);
    if (!r.id) redirect(`/proveedores/nuevo?error=${encodeURIComponent(r.error ?? "")}`);

    const telefono = txt("telefono");
    if (txt("nombre") || txt("email") || telefono) {
      const { error } = await supabase.from("contactos").insert({
        proveedor_id: r.id,
        nombre: txt("nombre"),
        cargo: txt("cargo"),
        email: txt("email"),
        telefono: normalizarTelefono(telefono) || telefono,
        tiene_whatsapp: txt("whatsapp") ?? "No sé",
        canal_preferido: txt("canal"),
        origen: "App",
      });
      if (error) throw error;
    }
    redirect(`/proveedores/${r.id}`);
  }

  return (
    <form action={guardar} className="tarjeta space-y-5 p-5 sm:p-6">
      <div>
        <p className="subtitulo text-amarillo">Nuevo proveedor</p>
        <h1 className="titulo mt-1">Dar de alta un proveedor</h1>
      </div>
      {searchParams.existente && (
        <p className="text-sm text-amber-300">
          Ya hay un proveedor con ese nombre:{" "}
          <Link href={`/proveedores/${searchParams.existente}`} className="enlace">
            ver su ficha
          </Link>
          .
        </p>
      )}
      {searchParams.error && <p className="text-sm text-red-400">No se pudo guardar: {searchParams.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo nombre="empresa" texto="Empresa" requerido />
        </div>
        <Campo nombre="pais" texto="País" />
        <Campo nombre="ciudad" texto="Ciudad" />
        <Campo nombre="marcas" texto="Marcas (separadas por coma)" ejemplo="EMD, CAT" />
        <Campo nombre="tipo" texto="Tipo" ejemplo="Distribuidor, fabricante, taller..." />
        <Campo nombre="web" texto="Web" />
        <Lista nombre="idioma" texto="Idioma" opciones={IDIOMAS} vacio />
        <div className="sm:col-span-2">
          <Campo nombre="productos" texto="Productos" />
        </div>
      </div>

      <div className="border-t border-borde pt-5">
        <p className="subtitulo mb-4">Contacto</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo nombre="nombre" texto="Nombre" />
          <Campo nombre="cargo" texto="Cargo" />
          <Campo nombre="email" texto="Email" tipo="email" />
          <Campo nombre="telefono" texto="Teléfono, con código de país" tipo="tel" ejemplo="+54 9 11 1234 5678" />
          <Lista nombre="whatsapp" texto="¿Tiene WhatsApp?" opciones={WHATSAPP} />
          <Lista nombre="canal" texto="Canal preferido" opciones={CANALES} vacio />
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="notas">Notas</label>
        <textarea id="notas" name="notas" rows={3} className="campo" />
      </div>
      <button className="boton">Guardar proveedor</button>
    </form>
  );
}

function Campo(p: { nombre: string; texto: string; tipo?: string; ejemplo?: string; requerido?: boolean }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <input id={p.nombre} name={p.nombre} type={p.tipo ?? "text"} placeholder={p.ejemplo} required={p.requerido} className="campo" />
    </div>
  );
}

function Lista(p: { nombre: string; texto: string; opciones: string[]; vacio?: boolean }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <select id={p.nombre} name={p.nombre} className="campo" defaultValue={p.vacio ? "" : p.opciones[0]}>
        {p.vacio && <option value="">—</option>}
        {p.opciones.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
