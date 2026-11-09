"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizarPn } from "@/lib/pn";
import { CONDICIONES_STOCK, filasDeMovimiento, leerStockPegado, marcaStock, TIPOS_MOVIMIENTO, type TipoMovimiento } from "@/lib/stock";
import { clienteServidor } from "@/lib/supabase/servidor";

const lector = (form: FormData) => {
  const txt = (k: string) => String(form.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const t = txt(k)?.replace(",", ".");
    return t && Number.isFinite(Number(t)) ? Number(t) : null;
  };
  return { txt, num };
};

const conError = (ruta: string, mensaje: string): never => {
  const sep = ruta.includes("?") ? "&" : "?";
  redirect(`${ruta}${sep}error=${encodeURIComponent(mensaje)}`);
};

const condicion = (c: string | null) => (CONDICIONES_STOCK as readonly string[]).includes(c ?? "") ? c! : "Nuevo original";

export async function crearArticulo(form: FormData) {
  const { txt, num } = lector(form);
  const supabase = clienteServidor();
  const pn = txt("pn");
  if (!pn || !normalizarPn(pn)) conError("/stock/nuevo", "Falta el PN.");
  const datos = {
    pn: pn!,
    marca: marcaStock(txt("marca")),
    descripcion: txt("descripcion"),
    modelo_motor: txt("modelo_motor"),
    condicion: condicion(txt("condicion")),
    costo_unitario: num("costo"),
    precio_venta: num("precio"),
    moneda: txt("moneda") ?? "USD",
    notas: txt("notas"),
  };
  const { data, error } = await supabase.from("stock_articulos").insert(datos).select("id").single();
  if (error?.code === "23505") {
    const { data: previo } = await supabase
      .from("stock_articulos")
      .select("id, marca")
      .eq("pn_normalizado", normalizarPn(datos.pn))
      .eq("condicion", datos.condicion);
    const mismo = previo?.find((p) => (p.marca ?? "").toLowerCase() === (datos.marca ?? "").toLowerCase());
    if (mismo) conError(`/stock/${mismo.id}`, "Ese PN ya estaba en stock con la misma marca y condición: cargá el ingreso desde acá.");
  }
  if (error) throw error;

  const deposito = num("deposito");
  const cantidad = num("cantidad") ?? 0;
  if (deposito && cantidad > 0) {
    const { error: e } = await supabase
      .from("stock_movimientos")
      .insert({ articulo_id: data!.id, deposito_id: deposito, tipo: "ingreso", cantidad, referencia: "Alta del artículo" });
    if (e) throw e;
    const ubicacion = txt("ubicacion");
    if (ubicacion) await supabase.from("stock_existencias").update({ ubicacion }).eq("articulo_id", data!.id).eq("deposito_id", deposito);
  }
  revalidatePath("/stock");
  redirect(`/stock/${data!.id}`);
}

export async function editarArticulo(form: FormData) {
  const { txt, num } = lector(form);
  const id = num("id")!;
  const { error } = await clienteServidor()
    .from("stock_articulos")
    .update({
      pn: txt("pn") ?? undefined,
      marca: marcaStock(txt("marca")),
      descripcion: txt("descripcion"),
      modelo_motor: txt("modelo_motor"),
      condicion: condicion(txt("condicion")),
      costo_unitario: num("costo"),
      precio_venta: num("precio"),
      moneda: txt("moneda") ?? "USD",
      notas: txt("notas"),
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (error?.code === "23505") conError(`/stock/${id}?editar=1`, "Ya hay otro artículo con ese PN, marca y condición.");
  if (error) throw error;
  revalidatePath(`/stock/${id}`);
  redirect(`/stock/${id}`);
}

export async function borrarArticulo(form: FormData) {
  const { num } = lector(form);
  const { error } = await clienteServidor().from("stock_articulos").delete().eq("id", num("id")!);
  if (error) throw error;
  revalidatePath("/stock");
  redirect("/stock");
}

export async function registrarMovimiento(form: FormData) {
  const { txt, num } = lector(form);
  const supabase = clienteServidor();
  const articuloId = num("articulo")!;
  const ruta = `/stock/${articuloId}`;
  const tipo = txt("tipo") as TipoMovimiento;
  if (!TIPOS_MOVIMIENTO.includes(tipo)) conError(ruta, "Elegí el tipo de movimiento.");
  const depositoId = num("deposito");
  if (!depositoId) conError(ruta, "Elegí el depósito.");

  const { data: existencia } = await supabase
    .from("stock_existencias")
    .select("cantidad")
    .eq("articulo_id", articuloId)
    .eq("deposito_id", depositoId!)
    .maybeSingle();
  const filas = filasDeMovimiento({
    articuloId,
    tipo,
    depositoId: depositoId!,
    destinoId: num("destino"),
    cantidad: num("cantidad") ?? NaN,
    actual: Number(existencia?.cantidad ?? 0),
    referencia: txt("referencia"),
    notas: txt("notas"),
  });
  if (typeof filas === "string") conError(ruta, filas);

  // Las dos filas de una transferencia van en un solo insert: si una falla no se guarda ninguna.
  const { error } = await supabase.from("stock_movimientos").insert(filas as Exclude<typeof filas, string>);
  if (error?.code === "23514") conError(ruta, "No alcanza el stock de ese depósito (alguien lo movió recién). Revisá las cantidades.");
  if (error) throw error;

  const ubicacion = txt("ubicacion");
  const destino = tipo === "transferencia" ? num("destino") : depositoId;
  if (ubicacion && destino) await supabase.from("stock_existencias").update({ ubicacion }).eq("articulo_id", articuloId).eq("deposito_id", destino);
  revalidatePath(ruta);
  redirect(ruta);
}

export async function cambiarUbicacion(form: FormData) {
  const { txt, num } = lector(form);
  const articuloId = num("articulo")!;
  const { error } = await clienteServidor()
    .from("stock_existencias")
    .update({ ubicacion: txt("ubicacion") })
    .eq("articulo_id", articuloId)
    .eq("deposito_id", num("deposito")!);
  if (error) throw error;
  revalidatePath(`/stock/${articuloId}`);
  redirect(`/stock/${articuloId}`);
}

export async function guardarDeposito(form: FormData) {
  const { txt, num } = lector(form);
  const id = num("id");
  const nombre = txt("nombre");
  if (!nombre) conError("/stock/depositos", "Falta el nombre del depósito.");
  const datos = { nombre: nombre!, ubicacion: txt("ubicacion"), notas: txt("notas"), activo: id ? form.get("activo") === "on" : true };
  const supabase = clienteServidor();
  const { error } = id ? await supabase.from("depositos").update(datos).eq("id", id) : await supabase.from("depositos").insert(datos);
  if (error?.code === "23505") conError("/stock/depositos", `Ya hay un depósito que se llama "${nombre}".`);
  if (error) throw error;
  revalidatePath("/stock");
  redirect("/stock/depositos");
}

// Carga desde una planilla pegada. "sumar" agrega lo pegado a lo que ya hay; "fijar" deja en cada depósito
// la cantidad de la planilla (para un inventario o la primera carga si se repite).
export async function importarStock(form: FormData) {
  const { txt, num } = lector(form);
  const ruta = "/stock/importar";
  const { filas, error: errorLectura } = leerStockPegado(String(form.get("texto") ?? ""));
  if (errorLectura) conError(ruta, errorLectura);
  const modo = txt("modo") === "fijar" ? "fijar" : "sumar";
  const supabase = clienteServidor();

  // Depósitos: los que vienen por nombre en la planilla se crean si no existen.
  const { data: deps, error: eDeps } = await supabase.from("depositos").select("id, nombre");
  if (eDeps) throw eDeps;
  const depPorNombre = new Map((deps ?? []).map((d) => [d.nombre.toLowerCase(), d.id as number]));
  const porDefecto = num("deposito");
  const nuevos = Array.from(new Set(filas.map((f) => f.deposito).filter((d): d is string => !!d && !depPorNombre.has(d.toLowerCase()))));
  if (nuevos.length) {
    const { data, error } = await supabase.from("depositos").insert(nuevos.map((nombre) => ({ nombre }))).select("id, nombre");
    if (error) throw error;
    data.forEach((d) => depPorNombre.set(d.nombre.toLowerCase(), d.id));
  }
  if (!porDefecto && filas.some((f) => !f.deposito)) conError(ruta, "Hay renglones sin depósito: elegí uno para esos.");

  // Artículos: se buscan por PN normalizado + marca + condición; los que faltan se crean.
  const clave = (pnN: string, marca: string | null, cond: string) => `${pnN}|${(marca ?? "").toLowerCase()}|${cond}`;
  const idPorClave = new Map<string, number>();
  const pns = Array.from(new Set(filas.map((f) => normalizarPn(f.pn))));
  for (let i = 0; i < pns.length; i += 200) {
    const { data, error } = await supabase.from("stock_articulos").select("id, pn_normalizado, marca, condicion").in("pn_normalizado", pns.slice(i, i + 200));
    if (error) throw error;
    data.forEach((a) => idPorClave.set(clave(a.pn_normalizado, a.marca, a.condicion), a.id));
  }
  const datosDe = (f: (typeof filas)[number]) => ({
    pn: f.pn,
    marca: f.marca,
    condicion: f.condicion ?? "Nuevo original",
    ...(f.descripcion && { descripcion: f.descripcion }),
    ...(f.costo != null && { costo_unitario: f.costo }),
    ...(f.precio != null && { precio_venta: f.precio }),
    ...(f.moneda && { moneda: f.moneda }),
  });
  const faltan = new Map<string, ReturnType<typeof datosDe>>();
  const actualizar: [number, ReturnType<typeof datosDe>][] = [];
  for (const f of filas) {
    const d = datosDe(f);
    const k = clave(normalizarPn(f.pn), d.marca, d.condicion);
    const id = idPorClave.get(k);
    if (id) actualizar.push([id, d]);
    else if (!faltan.has(k)) faltan.set(k, d);
  }
  const listaFaltan = Array.from(faltan.values());
  for (let i = 0; i < listaFaltan.length; i += 200) {
    const { data, error } = await supabase.from("stock_articulos").insert(listaFaltan.slice(i, i + 200)).select("id, pn_normalizado, marca, condicion");
    if (error) throw error;
    data.forEach((a) => idPorClave.set(clave(a.pn_normalizado, a.marca, a.condicion), a.id));
  }
  // Precio, costo o descripción nuevos pisan los anteriores solo si vinieron en la planilla.
  const conCambios = actualizar.filter(([, d]) => Object.keys(d).length > 3);
  for (let i = 0; i < conCambios.length; i += 20) {
    await Promise.all(conCambios.slice(i, i + 20).map(([id, d]) => supabase.from("stock_articulos").update({ ...d, actualizado_en: new Date().toISOString() }).eq("id", id)));
  }

  // Movimientos: un ingreso por renglón, o un ajuste a la cantidad de la planilla.
  const destino = filas.map((f) => ({
    f,
    articulo: idPorClave.get(clave(normalizarPn(f.pn), f.marca, f.condicion ?? "Nuevo original"))!,
    deposito: f.deposito ? depPorNombre.get(f.deposito.toLowerCase())! : porDefecto!,
  }));
  const actual = new Map<string, number>();
  if (modo === "fijar") {
    const ids = Array.from(new Set(destino.map((d) => d.articulo)));
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await supabase.from("stock_existencias").select("articulo_id, deposito_id, cantidad").in("articulo_id", ids.slice(i, i + 200));
      if (error) throw error;
      data.forEach((e) => actual.set(`${e.articulo_id}|${e.deposito_id}`, Number(e.cantidad)));
    }
  }
  const referencia = modo === "fijar" ? "Inventario desde planilla" : "Carga desde planilla";
  const movimientos = destino.flatMap(({ f, articulo, deposito }) => {
    const filasMov = filasDeMovimiento({
      articuloId: articulo,
      tipo: modo === "fijar" ? "ajuste" : "ingreso",
      depositoId: deposito,
      cantidad: f.cantidad,
      actual: actual.get(`${articulo}|${deposito}`) ?? 0,
      referencia,
    });
    return typeof filasMov === "string" ? [] : filasMov;
  });
  for (let i = 0; i < movimientos.length; i += 500) {
    const { error } = await supabase.from("stock_movimientos").insert(movimientos.slice(i, i + 500));
    if (error) throw error;
  }
  const conUbicacion = destino.filter((d) => d.f.ubicacion);
  for (let i = 0; i < conUbicacion.length; i += 20) {
    await Promise.all(
      conUbicacion
        .slice(i, i + 20)
        .map((d) => supabase.from("stock_existencias").update({ ubicacion: d.f.ubicacion }).eq("articulo_id", d.articulo).eq("deposito_id", d.deposito)),
    );
  }
  revalidatePath("/stock");
  redirect(`/stock?importados=${filas.length}&nuevos=${listaFaltan.length}`);
}
