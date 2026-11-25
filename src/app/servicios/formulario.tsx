import Link from "next/link";
import { MARCAS_FRECUENTES } from "@/lib/marcas";
import { CATEGORIAS_SERVICIO, ESTADOS_SERVICIO, UNIDADES_SERVICIO, type Servicio } from "@/lib/servicios";

const MONEDAS = ["USD", "EUR", "ARS", "BRL", "PYG", "CNY", "INR"];

type Props = {
  accion: (form: FormData) => Promise<void>;
  proveedores: { id: string; empresa: string; pais: string | null }[];
  servicio?: Partial<Servicio>;
  boton: string;
};

// Alta y edición de un servicio. Los datos del proveedor se ocultan cuando el servicio es propio.
export function FormularioServicio({ accion, proveedores, servicio: s = {}, boton }: Props) {
  const hoy = new Date().toISOString().slice(0, 10);
  const propio = (s.prestador ?? "propio") === "propio";
  return (
    <form action={accion} className="group/form space-y-5">
      <fieldset>
        <legend className="etiqueta">¿Quién hace el servicio?</legend>
        <div className="grid grid-cols-2 gap-2">
          <Opcion id="prestador-propio" valor="propio" texto="Nosotros" detalle="Servicio propio presupuestado" marcado={propio} />
          <Opcion id="prestador-proveedor" valor="proveedor" texto="Un proveedor" detalle="Taller o parcero que nos cotizó" marcado={!propio} />
        </div>
      </fieldset>

      <div className="grid gap-4 group-has-[#prestador-propio:checked]/form:hidden sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="proveedor">Proveedor</label>
          <select id="proveedor" name="proveedor" defaultValue={s.proveedor_id ?? ""} className="campo">
            <option value="">No está en la lista</option>
            {proveedores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.empresa} {p.pais && `(${p.pais})`}
              </option>
            ))}
          </select>
          <Link href="/proveedores/nuevo" className="enlace mt-1 inline-block text-sm">
            Dar de alta un proveedor
          </Link>
        </div>
        <Campo nombre="proveedor_nombre" texto="Nombre del taller (si no está en la lista)" valor={s.proveedor_nombre} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Lista nombre="categoria" texto="Tipo de servicio" opciones={[...CATEGORIAS_SERVICIO]} valor={s.categoria ?? "Otro"} />
        <Lista nombre="estado" texto="Estado" opciones={[...ESTADOS_SERVICIO]} valor={s.estado ?? "presupuestado"} />
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="descripcion">Descripción del trabajo</label>
          <textarea id="descripcion" name="descripcion" rows={3} required defaultValue={s.descripcion ?? ""} placeholder="Ej. Overhaul top end motor EMD 16-645E7, incluye mano de obra y juntas" className="campo" />
        </div>
        <Campo nombre="marca" texto="Marca" valor={s.marca} lista="marcas-servicio" />
        <Campo nombre="modelo_motor" texto="Modelo de motor o reductor" valor={s.modelo_motor} />
        <Campo nombre="equipo" texto="Equipo" valor={s.equipo} placeholder="Motor principal, reductor, generador..." />
        <Campo nombre="cliente" texto="Cliente o embarcación" valor={s.cliente} />
        <Campo nombre="lugar" texto="Lugar" valor={s.lugar} placeholder="Ciudad, puerto o taller" />
        <Campo nombre="fecha" texto="Fecha del presupuesto" tipo="date" valor={s.fecha ?? hoy} />
        <div className="grid grid-cols-2 gap-4 sm:col-span-2 sm:grid-cols-5">
          <Campo nombre="precio" texto="Precio" tipo="number" valor={s.precio} />
          <Lista nombre="moneda" texto="Moneda" opciones={MONEDAS} valor={s.moneda ?? "USD"} />
          <Campo nombre="unidad" texto="Precio por" valor={s.unidad ?? "servicio"} lista="unidades-servicio" />
          <Campo nombre="cantidad" texto="Cantidad" tipo="number" valor={s.cantidad} placeholder="Horas, días..." />
          <Campo nombre="plazo" texto="Plazo (días)" tipo="number" valor={s.plazo_dias} />
        </div>
        <div className="sm:col-span-2">
          <label className="etiqueta" htmlFor="notas">Notas</label>
          <textarea id="notas" name="notas" rows={3} defaultValue={s.notas ?? ""} placeholder="Qué incluye y qué no, condiciones, contacto..." className="campo" />
        </div>
      </div>
      <datalist id="marcas-servicio">
        {MARCAS_FRECUENTES.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <datalist id="unidades-servicio">
        {UNIDADES_SERVICIO.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <button className="boton w-full sm:w-auto">{boton}</button>
    </form>
  );
}

// Lee el formulario y deja los datos listos para guardar en la tabla servicios.
export function leerFormularioServicio(form: FormData) {
  const txt = (k: string) => String(form.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = txt(k);
    if (!v) return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const prestador = txt("prestador") === "proveedor" ? "proveedor" : "propio";
  const categoria = (CATEGORIAS_SERVICIO as readonly string[]).includes(txt("categoria") ?? "") ? txt("categoria")! : "Otro";
  const estado = (ESTADOS_SERVICIO as readonly string[]).includes(txt("estado") ?? "") ? txt("estado")! : "presupuestado";
  const descripcion = txt("descripcion");
  if (!descripcion) throw new Error("Falta la descripción del servicio.");
  return {
    prestador,
    proveedor_id: prestador === "proveedor" ? txt("proveedor") : null,
    proveedor_nombre: prestador === "proveedor" ? txt("proveedor_nombre") : null,
    categoria,
    estado,
    descripcion,
    marca: txt("marca"),
    modelo_motor: txt("modelo_motor"),
    equipo: txt("equipo"),
    cliente: txt("cliente"),
    lugar: txt("lugar"),
    fecha: txt("fecha"),
    precio: num("precio"),
    moneda: txt("moneda"),
    unidad: txt("unidad"),
    cantidad: num("cantidad"),
    plazo_dias: num("plazo") == null ? null : Math.round(num("plazo")!),
    notas: txt("notas"),
  };
}

function Opcion(p: { id: string; valor: string; texto: string; detalle: string; marcado: boolean }) {
  return (
    <label htmlFor={p.id} className="cursor-pointer">
      <input id={p.id} type="radio" name="prestador" value={p.valor} defaultChecked={p.marcado} className="peer sr-only" />
      <span className="block h-full rounded-md border border-borde bg-fondo p-3 transition peer-checked:border-acento peer-checked:bg-acento/10 peer-focus-visible:ring-2 peer-focus-visible:ring-acento/40">
        <span className="block font-semibold text-white">{p.texto}</span>
        <span className="block text-xs secundario">{p.detalle}</span>
      </span>
    </label>
  );
}

function Campo(p: { nombre: string; texto: string; tipo?: string; valor?: string | number | null; lista?: string; placeholder?: string }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <input
        id={p.nombre}
        name={p.nombre}
        type={p.tipo ?? "text"}
        step={p.tipo === "number" ? "any" : undefined}
        inputMode={p.tipo === "number" ? "decimal" : undefined}
        defaultValue={p.valor ?? undefined}
        list={p.lista}
        placeholder={p.placeholder}
        className="campo"
      />
    </div>
  );
}

function Lista(p: { nombre: string; texto: string; opciones: string[]; valor: string }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <select id={p.nombre} name={p.nombre} className="campo" defaultValue={p.valor}>
        {p.opciones.map((o) => (
          <option key={o} value={o}>
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
