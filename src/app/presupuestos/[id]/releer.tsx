"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Vuelve a leer el archivo con IA y reemplaza los renglones (sirve si quedó a medias o con error).
export function Releer({ id, primeraVez }: { id: number; primeraVez: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"" | "leyendo" | "error">("");
  const [mensaje, setMensaje] = useState("");

  async function leer() {
    if (!primeraVez && !confirm("Se reemplazan los renglones actuales, incluidas las correcciones a mano. ¿Seguir?")) return;
    setEstado("leyendo");
    const r = await fetch("/api/presupuestos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ presupuestoId: id }) });
    const datos = await r.json().catch(() => ({ error: `Error ${r.status}` }));
    if (!r.ok) {
      setEstado("error");
      setMensaje(datos.error ?? `Error ${r.status}`);
    } else setEstado("");
    router.refresh();
  }

  return (
    <span className="flex flex-col gap-1">
      <button onClick={leer} disabled={estado === "leyendo"} className={primeraVez ? "boton" : "boton-secundario"}>
        {estado === "leyendo" ? "Leyendo con IA..." : primeraVez ? "Leer con IA" : "Volver a leer con IA"}
      </button>
      {estado === "error" && <span className="text-xs text-red-400">{mensaje}</span>}
    </span>
  );
}

export function BotonBorrar({ accion }: { accion: () => Promise<void> }) {
  return (
    <form action={accion} onSubmit={(e) => !confirm("¿Borrar este presupuesto, su archivo y sus renglones?") && e.preventDefault()}>
      <button className="chip border-red-400/40 text-red-300">Borrar presupuesto</button>
    </form>
  );
}
