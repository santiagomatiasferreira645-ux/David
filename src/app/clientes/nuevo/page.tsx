import Link from "next/link";
import { redirect } from "next/navigation";
import { MONEDAS, TIPOS_CLIENTE, crearCliente, listaDominios } from "@/lib/clientes";
import { normalizarTelefono } from "@/lib/pn";
import { clienteServidor } from "@/lib/supabase/servidor";
import { Campo, Lista, lector } from "../campos";

const WHATSAPP = ["No sé", "Sí", "No"];

export default function NuevoCliente({ searchParams }: { searchParams: { error?: string; existente?: string } }) {
  async function guardar(form: FormData) {
    "use server";
    const { txt, num } = lector(form);
    const supabase = clienteServidor();
    const r = await crearCliente(supabase, {
      empresa: txt("empresa")!,
      razon_social: txt("razon_social"),
      ruc: txt("ruc"),
      pais: txt("pais"),
      ciudad: txt("ciudad"),
      tipo: txt("tipo"),
      moneda: txt("moneda") ?? "USD",
      condicion_pago: txt("condicion_pago"),
      margen_pct: num("margen_pct"),
      dominios: listaDominios(txt("dominios")).join(", ") || null,
      notas: txt("notas"),
      origen: "App",
    });
    if (r.existente) redirect(`/clientes/nuevo?existente=${r.id}`);
    if (!r.id) redirect(`/clientes/nuevo?error=${encodeURIComponent(r.error ?? "")}`);

    const telefono = txt("telefono");
    if (txt("nombre") || txt("email") || telefono) {
      const { error } = await supabase.from("clientes_contactos").insert({
        cliente_id: r.id,
        nombre: txt("nombre"),
        cargo: txt("cargo"),
        email: txt("email"),
        telefono: normalizarTelefono(telefono) || telefono,
        tiene_whatsapp: txt("whatsapp") ?? "No sé",
        origen: "App",
      });
      if (error) throw error;
    }
    redirect(`/clientes/${r.id}`);
  }

  return (
    <form action={guardar} className="tarjeta space-y-5 p-5 sm:p-6">
      <div>
        <p className="subtitulo text-amarillo">Nuevo cliente</p>
        <h1 className="titulo mt-1">Dar de alta un cliente</h1>
      </div>
      {searchParams.existente && (
        <p className="text-sm text-amber-300">
          Ya hay un cliente con ese nombre:{" "}
          <Link href={`/clientes/${searchParams.existente}`} className="enlace">
            ver su ficha
          </Link>
          .
        </p>
      )}
      {searchParams.error && <p className="text-sm text-red-400">No se pudo guardar: {searchParams.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo nombre="empresa" texto="Empresa" requerido clase="sm:col-span-2" />
        <Campo nombre="razon_social" texto="Razón social" />
        <Campo nombre="ruc" texto="RUC / CUIT / CNPJ" />
        <Campo nombre="pais" texto="País" />
        <Campo nombre="ciudad" texto="Ciudad" />
        <Lista nombre="tipo" texto="Tipo" opciones={TIPOS_CLIENTE} vacio />
        <Campo nombre="dominios" texto="Dominios de mail" ejemplo="empresa.com.py" />
      </div>

      <div className="border-t border-borde pt-5">
        <p className="subtitulo mb-4">Condiciones de precio</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Lista nombre="moneda" texto="Moneda" opciones={MONEDAS} />
          <Campo nombre="margen_pct" texto="Margen sobre costo (%)" tipo="number" ejemplo="30" />
          <Campo nombre="condicion_pago" texto="Condición de pago" ejemplo="30 días" />
        </div>
      </div>

      <div className="border-t border-borde pt-5">
        <p className="subtitulo mb-4">Contacto</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo nombre="nombre" texto="Nombre" />
          <Campo nombre="cargo" texto="Cargo" ejemplo="Compras, jefe de máquinas..." />
          <Campo nombre="email" texto="Email" tipo="email" />
          <Campo nombre="telefono" texto="Teléfono, con código de país" tipo="tel" ejemplo="+595 981 123456" />
          <Lista nombre="whatsapp" texto="¿Tiene WhatsApp?" opciones={WHATSAPP} />
        </div>
      </div>

      <div>
        <label className="etiqueta" htmlFor="notas">Notas</label>
        <textarea id="notas" name="notas" rows={3} className="campo" />
      </div>
      <button className="boton">Guardar cliente</button>
    </form>
  );
}
