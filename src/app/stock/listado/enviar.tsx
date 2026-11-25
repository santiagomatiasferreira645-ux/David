"use client";

import { useRef, useState } from "react";

// Teléfono para wa.me: solo dígitos con código de país. Sin "+" se acepta si ya trae el código (11 dígitos o más).
export function telefonoWhatsapp(tel: string): string {
  const digitos = tel.replace(/\D/g, "").replace(/^00/, "");
  if (!digitos) return "";
  return tel.trim().startsWith("+") || digitos.length >= 11 ? digitos : "";
}

const mensajeInicial = (nombre: string) =>
  `Hola${nombre.trim() ? ` ${nombre.trim().split(" ")[0]}` : ""}, ¿cómo estás? Te paso el listado de stock disponible. Cualquier consulta o pedido, quedo a disposición. Saludos.`;

// Botones para mandar el listado al cliente. En el celular, "Compartir PDF" abre WhatsApp, mail, etc. con el archivo
// adjunto. WhatsApp y Mail mandan el mensaje con un link al PDF que vence a los 7 días (sirve también desde la PC).
export function EnviarListado() {
  const raiz = useRef<HTMLDivElement>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mail, setMail] = useState("");
  const [texto, setTexto] = useState(mensajeInicial(""));
  const [editado, setEditado] = useState(false);
  const [trabajando, setTrabajando] = useState("");
  const [error, setError] = useState("");
  const [link, setLink] = useState("");

  // Las opciones del listado salen del mismo formulario (depósito, marca, logo y precios).
  const opciones = () => {
    const form = raiz.current?.closest("form");
    const datos = new FormData(form ?? undefined);
    const params: Record<string, string> = {};
    for (const k of ["deposito", "marca", "empresa", "precios"]) {
      const v = datos.get(k);
      if (typeof v === "string" && v) params[k] = v;
    }
    return params;
  };

  async function compartir() {
    setError("");
    setTrabajando("compartir");
    try {
      const r = await fetch(`/api/stock/pdf?${new URLSearchParams(opciones())}`);
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "No se pudo armar el PDF.");
      const nombreArchivo = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "stock.pdf";
      const archivo = new File([await r.blob()], nombreArchivo, { type: "application/pdf" });
      if (!navigator.canShare?.({ files: [archivo] })) throw new Error("Este navegador no puede compartir archivos: usá WhatsApp o Mail.");
      await navigator.share({ files: [archivo], text: texto, title: "Stock disponible" });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : String(e));
    }
    setTrabajando("");
  }

  async function enlace(): Promise<string> {
    if (link) return link;
    const r = await fetch("/api/stock/pdf/enlace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(opciones()) });
    const datos = await r.json();
    if (!r.ok) throw new Error(datos.error ?? "No se pudo crear el link.");
    setLink(datos.url);
    return datos.url;
  }

  async function enviar(canal: "whatsapp" | "mail") {
    setError("");
    setTrabajando(canal);
    // La pestaña de WhatsApp se abre antes de esperar el link: si no, el navegador del celular la bloquea.
    const ventana = canal === "whatsapp" ? window.open("", "_blank") : null;
    try {
      const url = await enlace();
      const cuerpo = `${texto}\n\n${url}`;
      if (canal === "whatsapp") {
        const destino = `https://wa.me/${telefonoWhatsapp(telefono)}?text=${encodeURIComponent(cuerpo)}`;
        if (ventana) ventana.location.href = destino;
        else window.location.href = destino;
      } else {
        const q = new URLSearchParams({ subject: "Listado de stock disponible", body: cuerpo }).toString().replace(/\+/g, "%20");
        window.location.href = `mailto:${mail.trim()}?${q}`;
      }
    } catch (e) {
      ventana?.close();
      setError(e instanceof Error ? e.message : String(e));
    }
    setTrabajando("");
  }

  return (
    <div ref={raiz} className="space-y-4 border-t border-borde/60 pt-5">
      <p className="subtitulo text-amarillo">Enviar al cliente</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor="cliente-nombre">Cliente o contacto</label>
          <input
            id="cliente-nombre"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              if (!editado) setTexto(mensajeInicial(e.target.value));
            }}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="cliente-tel">WhatsApp (con código de país)</label>
          <input id="cliente-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} type="tel" placeholder="+54 9 11 1234 5678" className="campo" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="cliente-mail">Mail</label>
          <input id="cliente-mail" value={mail} onChange={(e) => setMail(e.target.value)} type="email" className="campo" />
        </div>
        <div className="sm:col-span-3">
          <label className="etiqueta" htmlFor="cliente-texto">Mensaje</label>
          <textarea
            id="cliente-texto"
            rows={3}
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setEditado(true);
            }}
            className="campo"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={compartir} disabled={!!trabajando} className="boton">
          {trabajando === "compartir" ? "Armando..." : "Compartir PDF"}
        </button>
        <button type="button" onClick={() => enviar("whatsapp")} disabled={!!trabajando} className="boton-secundario">
          {trabajando === "whatsapp" ? "Preparando..." : "WhatsApp"}
        </button>
        <button type="button" onClick={() => enviar("mail")} disabled={!!trabajando} className="boton-secundario">
          {trabajando === "mail" ? "Preparando..." : "Mail"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-xs secundario">
        Compartir PDF manda el archivo adjunto (desde el celular elegís WhatsApp, Gmail, etc.). WhatsApp y Mail mandan el mensaje con un link al PDF que el
        cliente abre sin usuario y vence a los 7 días; sin teléfono, WhatsApp te deja elegir el contacto.
      </p>
    </div>
  );
}
