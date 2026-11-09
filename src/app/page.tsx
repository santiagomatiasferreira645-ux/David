import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE_MODULO, MODULOS, moduloPorId, type Modulo } from "@/lib/modulos";
import { clienteServidor } from "@/lib/supabase/servidor";
import { IconoModulo } from "./icono-modulo";
import { Orientador } from "./orientador";

// Inicio: los módulos de la app como entrada principal. Arriba, "¿Qué necesitás hacer?" lleva directo al
// lugar indicado (o busca el PN si se escribe uno) y "Seguir en …" retoma el último módulo usado.
export default async function Inicio() {
  const supabase = clienteServidor();
  const ultimo = moduloPorId(cookies().get(COOKIE_MODULO)?.value);

  // Si la tabla de un módulo todavía no existe, la consulta falla y la tarjeta se muestra sin cifra.
  const conteos = new Map(
    await Promise.all(
      MODULOS.filter((m) => m.disponible && m.conteo).map(async (m) => {
        const { count, error } = await supabase.from(m.conteo!.tabla).select("*", { count: "exact", head: true });
        return [m.id, error ? null : count] as const;
      }),
    ),
  );

  const disponibles = MODULOS.filter((m) => m.disponible);
  const proximos = MODULOS.filter((m) => !m.disponible);

  return (
    <div className="space-y-6">
      <section className="tarjeta space-y-4 p-5 sm:p-6">
        <div>
          <p className="subtitulo text-amarillo">Inicio</p>
          <h1 className="titulo mt-1 text-2xl">¿Qué necesitás hacer?</h1>
        </div>
        <Orientador />
        {ultimo && (
          <Link
            href={ultimo.href}
            className={`flex items-center gap-3 rounded-md border border-borde bg-panel2 px-3 py-2.5 text-sm transition hover:border-acento/60`}
          >
            <span className={`rounded-md p-1.5 ${ultimo.color.fondo} ${ultimo.color.texto}`}>
              <IconoModulo modulo={ultimo} className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="secundario">Seguir en </span>
              <span className="font-semibold text-white">{ultimo.nombre}</span>
            </span>
            <span className="text-acento" aria-hidden>
              →
            </span>
          </Link>
        )}
      </section>

      <section>
        <h2 className="subtitulo mb-2 text-amarillo/80">Módulos</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {disponibles.map((m) => (
            <TarjetaModulo key={m.id} modulo={m} cifra={conteos.get(m.id) ?? null} />
          ))}
          {proximos.map((m) => (
            <TarjetaModulo key={m.id} modulo={m} cifra={null} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function TarjetaModulo({ modulo: m, cifra }: { modulo: Modulo; cifra: number | null }) {
  const cabecera = (
    <div className="flex items-start gap-3">
      <span className={`shrink-0 rounded-lg p-2.5 ${m.color.fondo} ${m.color.texto}`}>
        <IconoModulo modulo={m} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <h3 className="text-lg font-semibold text-white group-hover:text-acento">{m.nombre}</h3>
          {m.disponible && cifra != null && m.conteo && (
            <span className="font-mono text-xs secundario">
              <span className="text-base font-semibold text-white">{cifra}</span> {m.conteo.texto}
            </span>
          )}
          {!m.disponible && <span className="chip border-borde text-apagado">Próximamente</span>}
        </div>
        <p className="mt-0.5 text-sm secundario">{m.descripcion}</p>
      </div>
    </div>
  );

  if (!m.disponible) {
    return <li className={`tarjeta border-t-2 opacity-50 ${m.color.linea}`}>{cabecera}</li>;
  }

  return (
    <li className={`tarjeta flex flex-col gap-3 border-t-2 transition hover:border-acento/40 ${m.color.linea}`}>
      <Link href={m.href} className="group block">
        {cabecera}
      </Link>
      <div className="mt-auto flex flex-wrap gap-2 border-t border-borde/60 pt-3">
        {m.acciones.slice(0, 3).map((a) => (
          <Link key={a.href} href={a.href} className="boton-secundario px-2.5 py-1.5 text-[13px]">
            {a.texto}
          </Link>
        ))}
      </div>
    </li>
  );
}
