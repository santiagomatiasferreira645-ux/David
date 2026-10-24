import { MOTIVO_TEXTO, type Motivo } from "@/lib/busqueda";

const ESTADO: Record<string, string> = {
  abierta: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  cotizada: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  comprada: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  perdida: "border-slate-500/40 bg-slate-500/10 text-slate-400",
};

export const MOTIVO_COLOR: Record<Motivo, { chip: string; barra: string }> = {
  cotizo_este_pn: { chip: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300", barra: "bg-emerald-400" },
  consultado_por_este_pn: { chip: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300", barra: "bg-cyan-400" },
  maneja_la_marca: { chip: "border-slate-500/40 bg-slate-500/10 text-slate-300", barra: "bg-slate-500" },
};

export function Estado({ estado }: { estado: string }) {
  return <span className={`chip ${ESTADO[estado] ?? ESTADO.perdida}`}>{estado}</span>;
}

export function MotivoChip({ motivo }: { motivo: Motivo }) {
  return <span className={`chip ${MOTIVO_COLOR[motivo].chip}`}>{MOTIVO_TEXTO[motivo]}</span>;
}
