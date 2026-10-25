"use client";

import Link from "next/link";
import { useState } from "react";
import { leerListaPn, type ItemLista } from "@/lib/lista-pn";
import { normalizarPn } from "@/lib/pn";
import type { ResumenPn } from "@/lib/multiple";

const MAX_PN = 200;

function linkBusqueda(it: ItemLista, marca: string, cliente: string) {
  const p = new URLSearchParams({ pn: it.pn, cantidad: String(it.cantidad) });
  if (marca) p.set("marca", marca);
  if (cliente) p.set("cliente", cliente);
  return `/buscar?${p}`;
}

// Lista de PN de un pedido: se tipea separada por comas o se pega desde Excel, se revisa en la tabla y se busca todo junto.
export function BusquedaMultiple({ marcas }: { marcas: string[] }) {
  const [texto, setTexto] = useState("");
  const [items, setItems] = useState<ItemLista[]>([]);
  const [marca, setMarca] = useState("");
  const [cliente, setCliente] = useState("");
  const [resultados, setResultados] = useState<Map<string, ResumenPn> | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  function leer(valor: string) {
    setTexto(valor);
    setItems(leerListaPn(valor));
    setResultados(null);
  }

  function cambiar(i: number, cambio: Partial<ItemLista>) {
    setItems(items.map((it, n) => (n === i ? { ...it, ...cambio } : it)));
    setResultados(null);
  }

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const validos = items.filter((it) => normalizarPn(it.pn));
    setItems(validos);
    if (!validos.length) return;
    setBuscando(true);
    setError("");
    try {
      const r = await fetch("/api/busqueda-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pns: validos.map((it) => it.pn) }),
      });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error ?? "No se pudo buscar.");
      setResultados(new Map((datos.resultados as ResumenPn[]).map((x) => [normalizarPn(x.pn), x])));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBuscando(false);
  }

  const filas = items.map((it) => ({ it, r: resultados?.get(normalizarPn(it.pn)) }));
  const enCatalogo = filas.filter((f) => f.r?.hojas.length).length;
  const conProveedor = filas.filter((f) => f.r?.proveedores).length;
  const sinNada = filas.filter((f) => f.r && !f.r.hojas.length && !f.r.proveedores).length;

  async function copiar() {
    const encabezado = ["PN", "Cantidad", "Descripción", "Catálogo", "Hoja", "Proveedores", "Con precio", "Último precio", "Moneda", "Proveedor del precio"];
    const lineas = filas.map(({ it, r }) =>
      [
        it.pn,
        it.cantidad,
        it.descripcion || r?.descripcionCatalogo || "",
        r?.hojas[0]?.catalogo ?? "",
        r?.hojas[0]?.pagina ?? "",
        r?.proveedores ?? "",
        r?.conPrecio ?? "",
        r?.ultimoPrecio?.precio ?? "",
        r?.ultimoPrecio?.moneda ?? "",
        r?.ultimoPrecio?.proveedor ?? "",
      ].join("\t"),
    );
    await navigator.clipboard.writeText([encabezado.join("\t"), ...lineas].join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={buscar} className="tarjeta space-y-5 p-5 sm:p-6">
        <div>
          <Link href="/" className="enlace text-sm">
            ← Búsqueda de un PN
          </Link>
          <h1 className="titulo mt-2 text-2xl">Búsqueda múltiple</h1>
          <p className="mt-1 text-sm secundario">
            Tipeá los PN separados por coma (8455666, 8N-7005) o copiá las filas del pedido en Excel y pegalas acá, con cantidades y descripción si las tiene.
          </p>
        </div>
        <div>
          <label className="etiqueta" htmlFor="lista">Lista de PN</label>
          <textarea
            id="lista"
            value={texto}
            onChange={(e) => leer(e.target.value)}
            rows={5}
            autoFocus
            placeholder={"8455666, 8N-7005, 3077541\n\no pegá las filas copiadas de Excel"}
            className="campo font-mono text-sm"
            autoCapitalize="characters"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="marca">Marca (opcional, para todos)</label>
            <input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} list="marcas" placeholder="EMD" className="campo" />
            <datalist id="marcas">
              {marcas.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="etiqueta" htmlFor="cliente">Cliente o embarcación (opcional)</label>
            <input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} className="campo" />
          </div>
        </div>

        {items.length > 0 && (
          <div>
            <p className="subtitulo mb-2">
              {items.length} PN para buscar{items.length > MAX_PN && <span className="text-red-400"> · el máximo es {MAX_PN}</span>}
            </p>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>PN</th>
                    <th>Cant.</th>
                    <th>Descripción del pedido</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="min-w-[8rem]">
                        <input value={it.pn} onChange={(e) => cambiar(i, { pn: e.target.value })} className="campo-pn py-1 text-sm" aria-label="PN" />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={it.cantidad}
                          onChange={(e) => cambiar(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                          className="campo w-20 py-1 font-mono text-sm"
                          aria-label="Cantidad"
                        />
                      </td>
                      <td className="min-w-[10rem]">
                        <input value={it.descripcion} onChange={(e) => cambiar(i, { descripcion: e.target.value })} className="campo py-1 text-sm" aria-label="Descripción" />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => {
                            setItems(items.filter((_, n) => n !== i));
                            setResultados(null);
                          }}
                          className="px-1 text-lg text-apagado hover:text-red-400"
                          aria-label={`Quitar ${it.pn}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setItems([...items, { pn: "", cantidad: 1, descripcion: "" }])} className="enlace mt-2 text-sm">
              + Agregar PN
            </button>
          </div>
        )}

        <button className="boton w-full sm:w-auto" disabled={buscando || !items.length || items.length > MAX_PN}>
          {buscando ? "Buscando..." : `Buscar ${items.length || ""} PN`}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {resultados && (
        <section className="tarjeta">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
              <span>
                <span className="text-white">{enCatalogo}</span> <span className="secundario">en catálogos</span>
              </span>
              <span>
                <span className="text-emerald-300">{conProveedor}</span> <span className="secundario">con proveedores</span>
              </span>
              <span>
                <span className="text-amber-300">{sinNada}</span> <span className="secundario">sin resultados</span>
              </span>
            </div>
            <button type="button" onClick={copiar} className="boton-secundario">
              {copiado ? "Copiado" : "Copiar para Excel"}
            </button>
          </div>
          <ul className="divide-y divide-borde/60 sm:hidden">
            {filas.map(({ it, r }, i) => (
              <li key={i} className="space-y-2 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="pn font-semibold text-white">{it.pn}</span>
                  <span className="font-mono text-sm secundario">x {it.cantidad}</span>
                </div>
                {(it.descripcion || r?.descripcionCatalogo) && <p className="text-sm text-slate-200">{it.descripcion || r?.descripcionCatalogo}</p>}
                <Catalogo r={r} />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Proveedores r={r} />
                    <Precio r={r} />
                  </div>
                  <a href={linkBusqueda(it, marca.trim(), cliente.trim())} target="_blank" className="chip border-acento/40 bg-acento/10 py-1.5 text-acento">
                    Buscar proveedores
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <div className="-mx-1 hidden overflow-x-auto px-1 sm:block">
            <table className="tabla">
              <thead>
                <tr>
                  <th>PN</th>
                  <th>Cant.</th>
                  <th>Descripción</th>
                  <th>Catálogo</th>
                  <th>Proveedores</th>
                  <th>Último precio</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filas.map(({ it, r }, i) => (
                  <tr key={i} className="align-top">
                    <td className="pn whitespace-nowrap font-semibold text-white">{it.pn}</td>
                    <td className="font-mono">{it.cantidad}</td>
                    <td className="min-w-[12rem] text-slate-200">
                      {it.descripcion || r?.descripcionCatalogo || <span className="secundario">–</span>}
                    </td>
                    <td className="min-w-[10rem]">
                      <Catalogo r={r} />
                    </td>
                    <td className="whitespace-nowrap">
                      <Proveedores r={r} />
                    </td>
                    <td className="whitespace-nowrap">
                      <Precio r={r} />
                    </td>
                    <td>
                      <a href={linkBusqueda(it, marca.trim(), cliente.trim())} target="_blank" className="chip whitespace-nowrap border-acento/40 bg-acento/10 py-1.5 text-acento">
                        Buscar proveedores
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs secundario">
            Acá se compara el PN exacto. &quot;Buscar proveedores&quot; abre la búsqueda completa de ese PN en otra pestaña, con los proveedores que manejan la marca y las sugerencias de la IA.
          </p>
        </section>
      )}
    </div>
  );
}

function Catalogo({ r }: { r?: ResumenPn }) {
  if (!r?.hojas.length) return <span className="text-xs secundario">No figura en los catálogos</span>;
  return (
    <ul className="space-y-1">
      {r.hojas.map((h) => (
        <li key={h.link}>
          <Link href={h.link} target="_blank" className="enlace text-xs">
            {h.catalogo}
            {h.pagina ? ` · pág. ${h.pagina}` : ""}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Proveedores({ r }: { r?: ResumenPn }) {
  if (!r?.proveedores) return <span className="font-mono text-xs secundario">Sin proveedores</span>;
  return (
    <span className="block font-mono text-xs">
      <span className="text-white">
        {r.proveedores} {r.proveedores === 1 ? "proveedor" : "proveedores"}
      </span>
      {r.conPrecio > 0 && <span className="text-emerald-300"> · {r.conPrecio} con precio</span>}
    </span>
  );
}

function Precio({ r }: { r?: ResumenPn }) {
  if (!r?.ultimoPrecio) return null;
  return (
    <span className="block text-xs">
      <span className="font-mono text-emerald-300">
        {r.ultimoPrecio.precio.toLocaleString("es")} {r.ultimoPrecio.moneda}
      </span>
      <span className="secundario">
        {" "}
        · {r.ultimoPrecio.proveedor} · {r.ultimoPrecio.fecha.slice(0, 10)}
      </span>
    </span>
  );
}
