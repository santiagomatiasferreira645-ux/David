import Link from "next/link";
import { CONDICIONES_STOCK, MONEDAS_STOCK, formatoCantidad, type ArticuloStock, type Deposito } from "@/lib/stock";
import { MARCAS_FRECUENTES } from "@/lib/marcas";

export function AvisoError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="rounded-md border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>;
}

export function Campo(p: { nombre: string; texto: string; tipo?: string; valor?: string | number | null; requerido?: boolean; pn?: boolean; lista?: string; ayuda?: string }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <input
        id={p.nombre}
        name={p.nombre}
        type={p.tipo ?? "text"}
        inputMode={p.tipo === "number" ? "decimal" : undefined}
        step={p.tipo === "number" ? "any" : undefined}
        min={p.tipo === "number" ? 0 : undefined}
        defaultValue={p.valor ?? undefined}
        required={p.requerido}
        list={p.lista}
        autoCapitalize={p.pn ? "characters" : undefined}
        className={p.pn ? "campo-pn" : "campo"}
      />
      {p.ayuda && <p className="mt-1 text-xs secundario">{p.ayuda}</p>}
    </div>
  );
}

export function Lista(p: { nombre: string; texto: string; opciones: { valor: string; texto: string }[] | readonly string[]; valor?: string | null; vacio?: string; requerido?: boolean }) {
  const opciones = p.opciones.map((o) => (typeof o === "string" ? { valor: o, texto: o } : o));
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <select id={p.nombre} name={p.nombre} className="campo" defaultValue={p.valor ?? (p.vacio != null ? "" : opciones[0]?.valor)} required={p.requerido}>
        {p.vacio != null && <option value="">{p.vacio}</option>}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MarcasSugeridas() {
  return (
    <datalist id="marcas-stock">
      {MARCAS_FRECUENTES.map((m) => (
        <option key={m} value={m} />
      ))}
    </datalist>
  );
}

// Los campos del artículo, iguales en el alta y en la edición.
export function CamposArticulo({ a }: { a?: Partial<ArticuloStock> }) {
  return (
    <>
      <Campo nombre="pn" texto="PN" valor={a?.pn} requerido pn />
      <Campo nombre="marca" texto="Marca" valor={a?.marca} lista="marcas-stock" />
      <div className="sm:col-span-2">
        <Campo nombre="descripcion" texto="Descripción" valor={a?.descripcion} />
      </div>
      <Campo nombre="modelo_motor" texto="Modelo de motor o reductor" valor={a?.modelo_motor} />
      <Lista nombre="condicion" texto="Condición" opciones={CONDICIONES_STOCK} valor={a?.condicion} />
      <Campo nombre="precio" texto="Precio de referencia (venta)" tipo="number" valor={a?.precio_venta} />
      <Campo nombre="costo" texto="Costo unitario" tipo="number" valor={a?.costo_unitario} />
      <Lista nombre="moneda" texto="Moneda" opciones={MONEDAS_STOCK} valor={a?.moneda} />
      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="notas">Notas</label>
        <textarea id="notas" name="notas" rows={2} defaultValue={a?.notas ?? undefined} className="campo" />
      </div>
      <MarcasSugeridas />
    </>
  );
}

export const opcionesDeposito = (depositos: Deposito[]) => depositos.map((d) => ({ valor: String(d.id), texto: d.ubicacion ? `${d.nombre} · ${d.ubicacion}` : d.nombre }));

// Chips con la cantidad en cada depósito (solo los que tienen algo).
export function ChipsDepositos({ articulo, depositos }: { articulo: ArticuloStock; depositos: Map<number, Deposito> }) {
  const con = articulo.stock_existencias.filter((e) => Number(e.cantidad) > 0);
  if (!con.length) return <span className="chip border-slate-500/40 text-slate-400">sin stock</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {con.map((e) => (
        <span key={e.deposito_id} className="chip border-borde bg-panel2 normal-case tracking-normal text-texto" title={e.ubicacion ?? undefined}>
          {depositos.get(e.deposito_id)?.nombre ?? "?"} <span className="text-verde">{formatoCantidad(Number(e.cantidad))}</span>
        </span>
      ))}
    </span>
  );
}

export function Encabezado({ titulo, children }: { titulo?: string; children?: React.ReactNode }) {
  return (
    <div>
      <nav className="subtitulo flex items-center gap-2 text-amarillo">
        <Link href="/stock" className="hover:text-white">
          Stock propio
        </Link>
      </nav>
      {titulo && <h1 className="titulo mt-1">{titulo}</h1>}
      {children}
    </div>
  );
}
