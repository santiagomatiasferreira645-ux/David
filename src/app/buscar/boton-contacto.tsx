"use client";

const ESTILO: Record<string, string> = {
  WhatsApp: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20",
  Llamada: "border-slate-400/40 bg-slate-400/10 text-slate-200 hover:bg-slate-400/20",
  Email: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20",
};

const ICONO: Record<string, string> = {
  WhatsApp: "M4 20l1.3-3.9A8 8 0 1 1 8 18.7L4 20Z",
  Llamada: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  Email: "M3 6h18v12H3zM3 6l9 7 9-7",
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
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition ${ESTILO[props.canal] ?? ""}`}
    >
      {ICONO[props.canal] && (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
          <path d={ICONO[props.canal]} />
        </svg>
      )}
      {props.canal}
    </a>
  );
}
