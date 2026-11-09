import type { Modulo } from "@/lib/modulos";

export function IconoModulo({ modulo, className = "h-6 w-6" }: { modulo: Modulo; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {modulo.icono.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
