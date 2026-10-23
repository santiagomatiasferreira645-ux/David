"use client";

const ESTILO: Record<string, string> = {
  WhatsApp: "bg-green-600 hover:bg-green-700 text-white",
  Llamada: "bg-slate-700 hover:bg-slate-800 text-white",
  Email: "bg-blue-700 hover:bg-blue-800 text-white",
};

// Registra el contacto en el historial y después abre el link (WhatsApp, teléfono o mail).
export function BotonContacto(props: { busquedaId: number; contactoId: number; proveedorId: string; canal: string; href: string }) {
  const registrar = () => {
    const cuerpo = JSON.stringify({ busquedaId: props.busquedaId, contactoId: props.contactoId, proveedorId: props.proveedorId, canal: props.canal });
    navigator.sendBeacon?.("/api/contacto-realizado", new Blob([cuerpo], { type: "application/json" }));
  };
  return (
    <a
      href={props.href}
      target={props.canal === "WhatsApp" ? "_blank" : undefined}
      rel="noreferrer"
      onClick={registrar}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${ESTILO[props.canal] ?? ""}`}
    >
      {props.canal}
    </a>
  );
}
