"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { TEXTO_MOVIMIENTO, TIPOS_MOVIMIENTO, formatoCantidad, type Deposito, type TipoMovimiento } from "@/lib/stock";

const AYUDA: Record<TipoMovimiento, string> = {
  ingreso: "Entra mercadería al depósito (compra, devolución).",
  egreso: "Sale mercadería del depósito (venta, uso en un servicio).",
  transferencia: "Pasa de un depósito a otro.",
  ajuste: "Corrige la cantidad después de contar: poné lo que hay de verdad.",
};

// Formulario de movimiento: según el tipo pide el depósito de destino o la cantidad contada.
export function FormMovimiento({
  articuloId,
  depositos,
  existencias,
  accion,
}: {
  articuloId: number;
  depositos: Deposito[];
  existencias: Record<number, number>;
  accion: (form: FormData) => Promise<void>;
}) {
  const conStock = depositos.find((d) => (existencias[d.id] ?? 0) > 0);
  const [tipo, setTipo] = useState<TipoMovimiento>("ingreso");
  const [deposito, setDeposito] = useState(String((conStock ?? depositos[0])?.id ?? ""));
  const hay = existencias[Number(deposito)] ?? 0;

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="articulo" value={articuloId} />
      <input type="hidden" name="tipo" value={tipo} />
      <div className="grid grid-cols-4 gap-1 rounded-md border border-borde bg-fondo p-1">
        {TIPOS_MOVIMIENTO.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`rounded px-1 py-1.5 text-xs font-medium sm:text-sm ${tipo === t ? "bg-acento/15 text-acento ring-1 ring-inset ring-acento/40" : "text-apagado hover:text-texto"}`}
          >
            {TEXTO_MOVIMIENTO[t]}
          </button>
        ))}
      </div>
      <p className="text-xs secundario">{AYUDA[tipo]}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="deposito">
            {tipo === "transferencia" ? "Desde" : "Depósito"}
          </label>
          <select id="deposito" name="deposito" value={deposito} onChange={(e) => setDeposito(e.target.value)} className="campo" required>
            {depositos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} ({formatoCantidad(existencias[d.id] ?? 0)})
              </option>
            ))}
          </select>
        </div>
        {tipo === "transferencia" && (
          <div>
            <label className="etiqueta" htmlFor="destino">Hacia</label>
            <select id="destino" name="destino" className="campo" required defaultValue="">
              <option value="" disabled>
                Elegir depósito
              </option>
              {depositos
                .filter((d) => String(d.id) !== deposito)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
            </select>
          </div>
        )}
        <div>
          <label className="etiqueta" htmlFor="cantidad">
            {tipo === "ajuste" ? `Cantidad contada (hoy figura ${formatoCantidad(hay)})` : "Cantidad"}
          </label>
          <input
            id="cantidad"
            name="cantidad"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            max={tipo === "egreso" || tipo === "transferencia" ? hay : undefined}
            required
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="referencia">Referencia</label>
          <input id="referencia" name="referencia" placeholder="Cliente, remito, factura, embarcación" className="campo" />
        </div>
        {tipo !== "egreso" && (
          <div>
            <label className="etiqueta" htmlFor="ubicacion">Estante o sector (opcional)</label>
            <input id="ubicacion" name="ubicacion" className="campo" />
          </div>
        )}
        <div className={tipo !== "egreso" ? "" : "sm:col-span-2"}>
          <label className="etiqueta" htmlFor="notas-mov">Notas</label>
          <input id="notas-mov" name="notas" className="campo" />
        </div>
      </div>
      <Enviar texto={`Registrar ${TEXTO_MOVIMIENTO[tipo].toLowerCase()}`} />
    </form>
  );
}

function Enviar({ texto }: { texto: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="boton" disabled={pending}>
      {pending ? "Guardando..." : texto}
    </button>
  );
}
