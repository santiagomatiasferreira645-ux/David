import { normalizarTelefono } from "./pn";

export type Idioma = "es" | "en" | "pt";

export type Consulta = {
  pn: string;
  marca?: string | null;
  descripcion?: string | null;
  cantidad?: number | null;
  nombreContacto?: string | null;
};

export function idiomaDe(idioma: string | null | undefined, pais: string | null | undefined): Idioma {
  const i = (idioma || "").toLowerCase();
  if (i.startsWith("ingl") || i === "en") return "en";
  if (i.startsWith("portu") || i === "pt") return "pt";
  if (i.startsWith("espa") || i === "es") return "es";
  if (pais === "Brasil") return "pt";
  if (["USA", "China", "India", "Bangladesh", "Países Bajos", "Alemania", "Italia", "Reino Unido"].includes(pais || "")) return "en";
  return "es";
}

export function asunto(c: Consulta, idioma: Idioma): string {
  const marca = c.marca ? ` ${c.marca}` : "";
  return {
    es: `Consulta de precio PN ${c.pn}${marca}`,
    en: `RFQ PN ${c.pn}${marca}`,
    pt: `Cotação PN ${c.pn}${marca}`,
  }[idioma];
}

export function mensaje(c: Consulta, idioma: Idioma): string {
  const cant = c.cantidad ?? 1;
  const desc = c.descripcion ? ` (${c.descripcion})` : "";
  const marca = c.marca ? ` ${c.marca}` : "";
  const nombre = c.nombreContacto ? ` ${c.nombreContacto}` : "";
  return {
    es:
      `Hola${nombre}, ¿cómo estás?\n` +
      `Necesitamos cotización de ${cant} unidad(es) del PN ${c.pn}${marca}${desc}.\n` +
      `Por favor indicar precio unitario, moneda, condición (nuevo original, OEM, alternativo o usado), plazo de entrega e Incoterm.\n` +
      `Muchas gracias.`,
    en:
      `Hello${nombre},\n` +
      `Please quote ${cant} pc(s) of PN ${c.pn}${marca}${desc}.\n` +
      `Kindly include unit price, currency, condition (genuine new, OEM, aftermarket or used), lead time and Incoterm.\n` +
      `Thank you.`,
    pt:
      `Olá${nombre}, tudo bem?\n` +
      `Precisamos de cotação de ${cant} unidade(s) do PN ${c.pn}${marca}${desc}.\n` +
      `Por favor informar preço unitário, moeda, condição (novo original, OEM, alternativo ou usado), prazo de entrega e Incoterm.\n` +
      `Obrigado.`,
  }[idioma];
}

export function linkMail(email: string | null | undefined, c: Consulta, idioma: Idioma): string | null {
  if (!email) return null;
  const q = new URLSearchParams({ subject: asunto(c, idioma), body: mensaje(c, idioma) });
  // URLSearchParams codifica espacios como "+", que los clientes de correo no siempre interpretan.
  return `mailto:${email}?${q.toString().replace(/\+/g, "%20")}`;
}

export function linkWhatsapp(tel: string | null | undefined, c: Consulta, idioma: Idioma): string | null {
  const t = normalizarTelefono(tel);
  if (!t) return null;
  return `https://wa.me/${t.slice(1)}?text=${encodeURIComponent(mensaje(c, idioma))}`;
}

export function linkLlamada(tel: string | null | undefined): string | null {
  const t = normalizarTelefono(tel);
  return t ? `tel:${t}` : null;
}

// Hora local del proveedor y si está en horario comercial (lunes a viernes, 8 a 18).
export function horaLocal(zona: string | null | undefined, ahora = new Date()): { hora: string; abierto: boolean } | null {
  if (!zona) return null;
  try {
    const partes = new Intl.DateTimeFormat("es", {
      timeZone: zona,
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(ahora);
    const val = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
    const h = Number(val("hour"));
    const dia = val("weekday").toLowerCase();
    const finde = dia.startsWith("sáb") || dia.startsWith("dom");
    return { hora: `${val("hour")}:${val("minute")}`, abierto: !finde && h >= 8 && h < 18 };
  } catch {
    return null;
  }
}
