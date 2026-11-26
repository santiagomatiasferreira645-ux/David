"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  aNumero,
  leerPegado,
  LEYENDA_IVA,
  llevaDetalle,
  llevaTabla,
  MEMBRETES,
  MODELOS,
  PLAZOS_PAGO,
  precioUsd,
  tituloDetalle,
  totales,
  valorizado,
  type Membrete,
  type Modelo,
  type PresupuestoEmitido,
} from "@/lib/presupuesto-emitido";
import { guardarPresupuesto } from "./acciones";
import { EnviarPresupuesto } from "./enviar";

// En el formulario los números se editan como texto (para aceptar "12,5" o "1.234,50") y se convierten al guardar.
type FilaUi = { clave: number; pn: string; descripcion: string; cantidad: string; precio: string };
type DetalleUi = { clave: number; descripcion: string; precio: string };

let contador = 0;
const clave = () => ++contador;
const aTexto = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const filaVacia = (): FilaUi => ({ clave: clave(), pn: "", descripcion: "", cantidad: "1", precio: "" });
const detalleVacio = (): DetalleUi => ({ clave: clave(), descripcion: "", precio: "" });

type Props = { inicial: PresupuestoEmitido; numeros: Record<Membrete, string>; clientes: string[] };

export function FormularioEmitir({ inicial, numeros, clientes }: Props) {
  const router = useRouter();
  const [p, setP] = useState(() => ({ ...inicial }));
  const [filas, setFilas] = useState<FilaUi[]>(() =>
    inicial.renglones.length
      ? inicial.renglones.map((r) => ({ clave: clave(), pn: r.pn, descripcion: r.descripcion, cantidad: aTexto(r.cantidad), precio: aTexto(r.precio) }))
      : [filaVacia()],
  );
  const [detalles, setDetalles] = useState<DetalleUi[]>(() =>
    inicial.detalles.length ? inicial.detalles.map((d) => ({ clave: clave(), descripcion: d.descripcion, precio: aTexto(d.precio) })) : [detalleVacio()],
  );
  const [entrega, setEntrega] = useState(aTexto(inicial.entrega_dias));
  const [oferta, setOferta] = useState(aTexto(inicial.oferta_dias));
  const pagoBase = PLAZOS_PAGO.find((x) => inicial.plazo_pago.startsWith(x)) ?? PLAZOS_PAGO[0];
  const [pago, setPago] = useState<string>(pagoBase);
  const [pagoExtra, setPagoExtra] = useState(inicial.plazo_pago.startsWith(pagoBase) ? inicial.plazo_pago.slice(pagoBase.length).trim() : inicial.plazo_pago);
  const [guardando, iniciar] = useTransition();
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cambios, setCambios] = useState(false);
  const [viendo, setViendo] = useState(false);

  const cambiar = <K extends keyof PresupuestoEmitido>(k: K, v: PresupuestoEmitido[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setCambios(true);
  };

  const datos = (): PresupuestoEmitido => ({
    ...p,
    renglones: filas.map((f) => ({ pn: f.pn, descripcion: f.descripcion, cantidad: aNumero(f.cantidad), precio: aNumero(f.precio) })),
    detalles: detalles.map((d) => ({ descripcion: d.descripcion, precio: aNumero(d.precio) })),
    entrega_dias: aNumero(entrega),
    oferta_dias: aNumero(oferta),
    plazo_pago: [pago, pagoExtra.trim()].filter(Boolean).join(" "),
  });
  const t = useMemo(
    () =>
      totales({
        modelo: p.modelo,
        renglones: filas.map((f) => ({ pn: f.pn, descripcion: f.descripcion, cantidad: aNumero(f.cantidad), precio: aNumero(f.precio) })),
        detalles: detalles.map((d) => ({ descripcion: d.descripcion, precio: aNumero(d.precio) })),
      }),
    [p.modelo, filas, detalles],
  );

  // Al cambiar de empresa, el número sugerido pasa al de esa empresa (si no se escribió otro).
  function elegirMembrete(m: Membrete) {
    setP((x) => ({ ...x, membrete: m, numero: !x.id && (!x.numero || x.numero === numeros[x.membrete]) ? numeros[m] : x.numero }));
    setCambios(true);
  }

  const cambiarFila = (k: number, campo: keyof Omit<FilaUi, "clave">, v: string) => {
    setFilas((fs) => fs.map((f) => (f.clave === k ? { ...f, [campo]: v } : f)));
    setCambios(true);
  };
  // Pegar varias filas copiadas de Excel en el PN: se reparten en renglones.
  function pegar(k: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const texto = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(texto.trim())) return;
    e.preventDefault();
    const leidas = leerPegado(texto).map((r) => ({
      clave: clave(),
      pn: r.pn,
      descripcion: r.descripcion,
      cantidad: aTexto(r.cantidad ?? 1),
      precio: aTexto(r.precio),
    }));
    setFilas((fs) => {
      const i = fs.findIndex((f) => f.clave === k);
      const vacia = !fs[i].pn && !fs[i].descripcion && !fs[i].precio;
      return [...fs.slice(0, i + (vacia ? 0 : 1)), ...leidas, ...fs.slice(i + 1)];
    });
    setCambios(true);
  }

  function guardar() {
    setError("");
    setAviso("");
    iniciar(async () => {
      const r = await guardarPresupuesto(datos());
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setCambios(false);
      setAviso("Presupuesto guardado.");
      if (!p.id) {
        setP((x) => ({ ...x, id: r.id }));
        router.replace(`/presupuestos/emitir?id=${r.id}`, { scroll: false });
      }
      router.refresh();
    });
  }

  // Vista previa del PDF sin guardar. La pestaña se abre antes de esperar, si no el celular la bloquea.
  async function vistaPrevia() {
    setError("");
    setViendo(true);
    const ventana = window.open("", "_blank");
    try {
      const r = await fetch("/api/presupuestos/emitidos/vista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos()),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "No se pudo armar el PDF.");
      const url = URL.createObjectURL(await r.blob());
      if (ventana) ventana.location.href = url;
      else window.open(url, "_blank");
    } catch (e) {
      ventana?.close();
      setError(e instanceof Error ? e.message : String(e));
    }
    setViendo(false);
  }

  const color = p.membrete === "daysa" ? "border-sky-400" : "border-cyan-400";

  return (
    <div className="space-y-4">
      <section className="tarjeta space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="subtitulo text-amarillo">Presupuestos</p>
            <h1 className="titulo mt-1">{p.id ? `Presupuesto ${p.numero ? `N° ${p.numero}` : `#${p.id}`}` : "Emitir presupuesto"}</h1>
          </div>
          <Link href="/presupuestos" className="enlace text-sm">
            ← Volver
          </Link>
        </div>

        <fieldset>
          <legend className="etiqueta">Hoja membretada</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(MEMBRETES) as Membrete[]).map((m) => (
              <Opcion
                key={m}
                activo={p.membrete === m}
                onClick={() => elegirMembrete(m)}
                texto={MEMBRETES[m].nombre}
                detalle={`Firma: ${MEMBRETES[m].firma.nombre}`}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="etiqueta">Tipo de presupuesto</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(MODELOS) as Modelo[]).map((m) => (
              <Opcion key={m} activo={p.modelo === m} onClick={() => cambiar("modelo", m)} texto={MODELOS[m].texto} detalle={MODELOS[m].detalle} />
            ))}
          </div>
        </fieldset>
      </section>

      <section className={`tarjeta space-y-4 border-l-4 p-5 sm:p-6 ${color}`}>
        <p className="subtitulo">Encabezado</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo
            id="numero"
            texto="Presupuesto N°"
            valor={p.numero}
            onChange={(v) => cambiar("numero", v)}
            placeholder={p.membrete === "daysa" ? "26133/26" : "1301-25"}
            mono
          />
          <Campo id="fecha" texto="Fecha" tipo="date" valor={p.fecha} onChange={(v) => cambiar("fecha", v)} />
          <div className="sm:col-span-2">
            <Campo id="lugar" texto="Lugar (va antes de la fecha)" valor={p.lugar} onChange={(v) => cambiar("lugar", v)} />
          </div>
          <div className="sm:col-span-2">
            <Campo
              id="cliente"
              texto="Señores (cliente)"
              valor={p.cliente}
              onChange={(v) => cambiar("cliente", v)}
              lista="clientes-emitir"
              placeholder="LHG Navegación"
            />
          </div>
          <div className="sm:col-span-2">
            <Campo
              id="atencion"
              texto="At. (persona o embarcación)"
              valor={p.atencion}
              onChange={(v) => cambiar("atencion", v)}
              placeholder="Sr. Julio Cañiza · R/E Don Kasbergen"
            />
          </div>
          <div className="sm:col-span-2">
            <Campo
              id="referencia"
              texto="Título / referencia"
              valor={p.referencia}
              onChange={(v) => cambiar("referencia", v)}
              placeholder="Provisión de repuestos para motor MAK 8M20"
            />
          </div>
          <div className="sm:col-span-2">
            <Campo
              id="referencia_detalle"
              texto="Ref. (opcional)"
              valor={p.referencia_detalle}
              onChange={(v) => cambiar("referencia_detalle", v)}
              placeholder="Ref.: SC 10360 · OM17767"
            />
          </div>
        </div>
        <datalist id="clientes-emitir">
          {clientes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </section>

      {llevaTabla(p.modelo) && (
        <section className="tarjeta space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="subtitulo">Repuestos · {filas.length}</p>
            <p className="text-xs secundario">Podés pegar filas copiadas de Excel en el PN: PN, descripción, cantidad, precio.</p>
          </div>
          <div className="hidden grid-cols-[2rem_9rem_1fr_5rem_7rem_8rem_2rem] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-apagado sm:grid">
            <span>Ítem</span>
            <span>PN</span>
            <span>Descripción</span>
            <span className="text-right">Cant.</span>
            <span className="text-right">P. unitario</span>
            <span className="text-right">Valorizado</span>
            <span />
          </div>
          <ul className="space-y-3 sm:space-y-1.5">
            {filas.map((f, i) => {
              const v = valorizado({ cantidad: aNumero(f.cantidad), precio: aNumero(f.precio) });
              return (
                <li
                  key={f.clave}
                  className="grid grid-cols-[2rem_1fr_2rem] items-center gap-2 rounded-md border border-borde/60 p-2 sm:grid-cols-[2rem_9rem_1fr_5rem_7rem_8rem_2rem] sm:border-0 sm:p-0"
                >
                  <span className="text-center font-mono text-sm text-apagado">{i + 1}</span>
                  <input
                    aria-label={`PN del ítem ${i + 1}`}
                    value={f.pn}
                    onChange={(e) => cambiarFila(f.clave, "pn", e.target.value)}
                    onPaste={(e) => pegar(f.clave, e)}
                    placeholder="PN"
                    className="campo-pn text-sm"
                    autoCapitalize="characters"
                  />
                  <button
                    type="button"
                    onClick={() => setFilas((fs) => (fs.length > 1 ? fs.filter((x) => x.clave !== f.clave) : [filaVacia()]))}
                    aria-label={`Quitar ítem ${i + 1}`}
                    className="row-span-1 text-lg text-apagado hover:text-red-400 sm:order-last"
                  >
                    ×
                  </button>
                  <input
                    aria-label={`Descripción del ítem ${i + 1}`}
                    value={f.descripcion}
                    onChange={(e) => cambiarFila(f.clave, "descripcion", e.target.value)}
                    placeholder="Descripción"
                    className="campo col-span-3 text-sm sm:col-span-1"
                  />
                  <div className="col-span-3 grid grid-cols-3 gap-2 sm:contents">
                    <input
                      aria-label={`Cantidad del ítem ${i + 1}`}
                      value={f.cantidad}
                      onChange={(e) => cambiarFila(f.clave, "cantidad", e.target.value)}
                      inputMode="decimal"
                      placeholder="Cant."
                      className="campo text-right font-mono text-sm"
                    />
                    <input
                      aria-label={`Precio unitario del ítem ${i + 1}`}
                      value={f.precio}
                      onChange={(e) => cambiarFila(f.clave, "precio", e.target.value)}
                      inputMode="decimal"
                      placeholder="P. unit."
                      className="campo text-right font-mono text-sm"
                    />
                    <span className="self-center text-right font-mono text-sm text-emerald-300">{v != null ? precioUsd(v) : "—"}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde/60 pt-3">
            <button type="button" onClick={() => setFilas((fs) => [...fs, filaVacia()])} className="boton-secundario">
              + Agregar ítem
            </button>
            <p className="font-mono">
              <span className="mr-3 text-xs uppercase tracking-wide text-apagado">
                {p.modelo === "repuestos" ? "Total presupuestado" : "Subtotal repuestos"}
              </span>
              <span className="text-lg font-semibold text-white">{precioUsd(t.repuestos)}</span>
            </p>
          </div>
        </section>
      )}

      {llevaDetalle(p.modelo) && (
        <section className="tarjeta space-y-3 p-5 sm:p-6">
          <p className="subtitulo">{tituloDetalle(p.modelo)}</p>
          <ul className="space-y-3">
            {detalles.map((d, i) => (
              <li key={d.clave} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_9rem_2rem]">
                <textarea
                  aria-label={`Detalle ${i + 1}`}
                  rows={3}
                  value={d.descripcion}
                  onChange={(e) => {
                    setDetalles((ds) => ds.map((x) => (x.clave === d.clave ? { ...x, descripcion: e.target.value } : x)));
                    setCambios(true);
                  }}
                  placeholder={p.modelo === "servicios" ? "Detalle del trabajo presupuestado" : "Mano de obra, traslado, flete..."}
                  className="campo col-span-2 text-sm sm:col-span-1"
                />
                <input
                  aria-label={`Precio del detalle ${i + 1}`}
                  value={d.precio}
                  onChange={(e) => {
                    setDetalles((ds) => ds.map((x) => (x.clave === d.clave ? { ...x, precio: e.target.value } : x)));
                    setCambios(true);
                  }}
                  inputMode="decimal"
                  placeholder="Precio USD"
                  className="campo self-start text-right font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setDetalles((ds) => (ds.length > 1 ? ds.filter((x) => x.clave !== d.clave) : [detalleVacio()]))}
                  aria-label={`Quitar detalle ${i + 1}`}
                  className="self-start pt-2 text-lg text-apagado hover:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde/60 pt-3">
            <button type="button" onClick={() => setDetalles((ds) => [...ds, detalleVacio()])} className="boton-secundario">
              + Agregar renglón
            </button>
            <p className="font-mono">
              <span className="mr-3 text-xs uppercase tracking-wide text-apagado">{p.modelo === "servicios" ? "Total presupuestado" : "Total general"}</span>
              <span className="text-lg font-semibold text-white">{precioUsd(t.total)}</span>
            </p>
          </div>
          <p className="text-xs secundario">Precio 0 sale como “Sin cargo”; sin precio, el renglón va sin importe.</p>
        </section>
      )}

      <section className="tarjeta space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="subtitulo">Condiciones de la oferta</p>
          <p className="text-xs font-semibold text-apagado">{LEYENDA_IVA} · valores en USD</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr] sm:items-center">
          <label htmlFor="entrega" className="text-sm font-semibold text-white">
            1. Tiempo de entrega
          </label>
          <div className="flex items-center gap-2">
            <input
              id="entrega"
              value={entrega}
              onChange={(e) => {
                setEntrega(e.target.value);
                setCambios(true);
              }}
              inputMode="numeric"
              className="campo w-24 text-right font-mono"
            />
            <span className="text-sm secundario">días</span>
          </div>

          <label htmlFor="pago" className="text-sm font-semibold text-white">
            2. Plazo de pago
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              id="pago"
              value={pago}
              onChange={(e) => {
                setPago(e.target.value);
                setCambios(true);
              }}
              className="campo w-32"
            >
              {PLAZOS_PAGO.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <input
              aria-label="Aclaración del plazo de pago"
              value={pagoExtra}
              onChange={(e) => {
                setPagoExtra(e.target.value);
                setCambios(true);
              }}
              placeholder="de fecha factura (opcional)"
              className="campo min-w-0 flex-1"
            />
          </div>

          <label htmlFor="oferta" className="text-sm font-semibold text-white">
            3. Mantenimiento de oferta
          </label>
          <div className="flex items-center gap-2">
            <input
              id="oferta"
              value={oferta}
              onChange={(e) => {
                setOferta(e.target.value);
                setCambios(true);
              }}
              inputMode="numeric"
              className="campo w-24 text-right font-mono"
            />
            <span className="text-sm secundario">días</span>
          </div>

          <label htmlFor="aclaraciones" className="text-sm font-semibold text-white sm:self-start sm:pt-2">
            4. Aclaraciones
          </label>
          <textarea
            id="aclaraciones"
            rows={2}
            value={p.aclaraciones}
            onChange={(e) => cambiar("aclaraciones", e.target.value)}
            placeholder="Aclaraciones de este presupuesto"
            className="campo"
          />

          <label htmlFor="lugar_entrega" className="text-sm font-semibold text-white">
            5. Lugar de entrega
          </label>
          <input
            id="lugar_entrega"
            value={p.lugar_entrega}
            onChange={(e) => cambiar("lugar_entrega", e.target.value)}
            placeholder="Depósito Complejo Barrail"
            className="campo"
          />
        </div>
      </section>

      <section className="tarjeta space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={guardar} disabled={guardando} className="boton">
            {guardando ? "Guardando..." : p.id ? "Guardar cambios" : "Guardar presupuesto"}
          </button>
          <button type="button" onClick={vistaPrevia} disabled={viendo} className="boton-secundario">
            {viendo ? "Armando..." : "Vista previa PDF"}
          </button>
          {p.id && !cambios && (
            <a href={`/api/presupuestos/emitidos/${p.id}/pdf`} target="_blank" rel="noreferrer" className="boton-secundario">
              Ver PDF guardado
            </a>
          )}
          <span className="ml-auto font-mono text-sm">
            Total <span className="text-lg font-semibold text-white">{precioUsd(t.total)}</span>
          </span>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {aviso && !cambios && <p className="text-sm text-emerald-300">{aviso}</p>}
        {cambios && p.id && <p className="text-xs text-amber-300">Hay cambios sin guardar: guardá antes de enviarlo.</p>}
        {p.id && !cambios ? (
          <EnviarPresupuesto id={p.id} cliente={p.cliente} numero={p.numero} empresa={MEMBRETES[p.membrete].nombre} />
        ) : (
          !p.id && <p className="text-xs secundario">Después de guardarlo aparecen los botones para mandarlo al cliente por WhatsApp o mail.</p>
        )}
      </section>
    </div>
  );
}

function Opcion({ activo, onClick, texto, detalle }: { activo: boolean; onClick: () => void; texto: string; detalle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`block h-full rounded-md border p-3 text-left transition ${activo ? "border-acento bg-acento/10" : "border-borde bg-fondo hover:border-apagado"}`}
    >
      <span className="block font-semibold text-white">{texto}</span>
      <span className="block text-xs secundario">{detalle}</span>
    </button>
  );
}

function Campo(p: {
  id: string;
  texto: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
  lista?: string;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.id}>
        {p.texto}
      </label>
      <input
        id={p.id}
        type={p.tipo ?? "text"}
        value={p.valor}
        onChange={(e) => p.onChange(e.target.value)}
        list={p.lista}
        placeholder={p.placeholder}
        className={`campo ${p.mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
