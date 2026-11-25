"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { formatoCantidad, formatoPrecio, leerStockPegado } from "@/lib/stock";

// Textarea para pegar la planilla, con la vista previa de cómo se va a leer antes de guardar.
export function PegarPlanilla({ depositos, accion }: { depositos: { valor: string; texto: string }[]; accion: (form: FormData) => Promise<void> }) {
  const [texto, setTexto] = useState("");
  const leido = useMemo(() => (texto.trim() ? leerStockPegado(texto) : null), [texto]);
  const sinDeposito = leido?.filas.some((f) => !f.deposito) ?? false;

  return (
    <form action={accion} className="space-y-4">
      <div className="tarjeta space-y-4 p-5">
        <div>
          <label className="etiqueta" htmlFor="texto">Planilla</label>
          <textarea
            id="texto"
            name="texto"
            rows={8}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"PN\tMarca\tDescripción\tCantidad\tDepósito\tPrecio\n8455666\tEMD\tBearing main\t4\tGalpón Zárate\t320"}
            className="campo font-mono text-sm"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="deposito">Depósito para los renglones sin depósito</label>
            <select id="deposito" name="deposito" className="campo" required={sinDeposito} defaultValue={depositos[0]?.valor ?? ""}>
              <option value="">—</option>
              {depositos.map((d) => (
                <option key={d.valor} value={d.valor}>
                  {d.texto}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="etiqueta">Cantidades</legend>
            <label className="flex items-start gap-2 text-sm">
              <input type="radio" name="modo" value="sumar" defaultChecked className="mt-1" />
              <span>Sumar a lo que ya hay (mercadería que entra)</span>
            </label>
            <label className="mt-1 flex items-start gap-2 text-sm">
              <input type="radio" name="modo" value="fijar" className="mt-1" />
              <span>Reemplazar por la cantidad de la planilla (inventario contado)</span>
            </label>
          </fieldset>
        </div>
        {leido?.error && <p className="text-sm text-red-300">{leido.error}</p>}
        <Enviar cantidad={leido?.filas.length ?? 0} />
      </div>

      {leido && leido.filas.length > 0 && (
        <div className="tarjeta overflow-x-auto p-0">
          <p className="subtitulo px-3 pt-3">Vista previa · {leido.filas.length} renglones</p>
          <table className="tabla">
            <thead>
              <tr>
                <th>PN</th>
                <th>Marca</th>
                <th>Descripción</th>
                <th>Condición</th>
                <th className="text-right">Cant.</th>
                <th>Depósito</th>
                <th className="text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              {leido.filas.slice(0, 100).map((f, i) => (
                <tr key={i}>
                  <td className="pn whitespace-nowrap">{f.pn}</td>
                  <td>{f.marca}</td>
                  <td>{f.descripcion}</td>
                  <td className="text-xs secundario">{f.condicion ?? "Nuevo original"}</td>
                  <td className="text-right font-mono">{formatoCantidad(f.cantidad)}</td>
                  <td>{f.deposito ?? <span className="secundario">el elegido</span>}</td>
                  <td className="whitespace-nowrap text-right font-mono">{formatoPrecio(f.precio, f.moneda ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leido.filas.length > 100 && <p className="px-3 pb-3 text-xs secundario">Se muestran los primeros 100.</p>}
        </div>
      )}
    </form>
  );
}

function Enviar({ cantidad }: { cantidad: number }) {
  const { pending } = useFormStatus();
  return (
    <button className="boton" disabled={pending || cantidad === 0}>
      {pending ? "Cargando..." : cantidad ? `Cargar ${cantidad} renglones` : "Cargar"}
    </button>
  );
}
