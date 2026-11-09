"use client";

export function BotonBorrar() {
  return (
    <button
      className="boton-secundario text-red-300 hover:border-red-400/60 hover:text-red-300"
      onClick={(e) => {
        if (!confirm("¿Borrar este servicio? No se puede deshacer.")) e.preventDefault();
      }}
    >
      Borrar
    </button>
  );
}
