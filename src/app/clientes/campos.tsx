// Campos de formulario compartidos por las pantallas de clientes.
export function Campo(p: { nombre: string; texto: string; tipo?: string; valor?: string | number | null; ejemplo?: string; requerido?: boolean; clase?: string }) {
  return (
    <div className={p.clase}>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <input
        id={p.nombre}
        name={p.nombre}
        type={p.tipo ?? "text"}
        step={p.tipo === "number" ? "any" : undefined}
        inputMode={p.tipo === "number" ? "decimal" : undefined}
        defaultValue={p.valor ?? undefined}
        placeholder={p.ejemplo}
        required={p.requerido}
        className={p.nombre === "pn" ? "campo-pn" : "campo"}
      />
    </div>
  );
}

export function Lista(p: { nombre: string; texto: string; opciones: readonly string[]; valor?: string | null; vacio?: boolean }) {
  return (
    <div>
      <label className="etiqueta" htmlFor={p.nombre}>{p.texto}</label>
      <select id={p.nombre} name={p.nombre} className="campo" defaultValue={p.valor ?? (p.vacio ? "" : p.opciones[0])}>
        {p.vacio && <option value="">—</option>}
        {p.opciones.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// Lee un FormData como texto o número, vacío = null.
export function lector(form: FormData) {
  const txt = (k: string) => String(form.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const t = txt(k)?.replace(",", ".");
    return t && Number.isFinite(Number(t)) ? Number(t) : null;
  };
  return { txt, num };
}
