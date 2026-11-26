"use client";

import { useState } from "react";
import { telefonoWhatsapp } from "@/app/stock/listado/enviar";

const mensajeInicial = (contacto: string, numero: string) =>
  `Hola${contacto.trim() ? ` ${contacto.trim().split(" ")[0]}` : ""}, ¿cómo estás? Te paso el presupuesto${numero ? ` N° ${numero}` : ""}. Cualquier consulta, quedo a disposición. Saludos.`;

// Botones para mandar el presupuesto al cliente, igual que el listado de stock: en el celular "Compartir PDF" lo adjunta
// en WhatsApp, mail, etc.; WhatsApp y Mail mandan el mensaje con un link al PDF que vence a los 7 días.
export function EnviarPresupuesto({ id, cliente, numero, empresa }: { id: number; cliente: string; numero: string; empresa: string }) {
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mail, setMail] = useState("");
  const [texto, setTexto] = useState(mensajeInicial("", numero));
  const [editado, setEditado] = useState(false);
  const [trabajando, setTrabajando] = useState("");
  const [error, setError] = useState("");
  const asunto = `Presupuesto${numero ? ` N° ${numero}` : ""} · ${empresa}${cliente ? ` · ${cliente}` : ""}`;

  async function compartir() {
    setError("");
    setTrabajando("compartir");
    try {
      const r = await fetch(`/api/presupuestos/emitidos/${id}/pdf`);
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "No se pudo armar el PDF.");
      const nombre = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "presupuesto.pdf";
      const archivo = new File([await r.blob()], nombre, { type: "application/pdf" });
      if (!navigator.canShare?.({ files: [archivo] })) throw new Error("Este navegador no puede compartir archivos: usá WhatsApp o Mail.");
      await navigator.share({ files: [archivo], text: texto, title: asunto });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : String(e));
    }
    setTrabajando("");
  }

  async function enviar(canal: "whatsapp" | "mail") {
    setError("");
    setTrabajando(canal);
    // La pestaña de WhatsApp se abre antes de esperar el link: si no, el navegador del celular la bloquea.
    const ventana = canal === "whatsapp" ? window.open("", "_blank") : null;
    try {
      // Link nuevo cada vez: si el presupuesto se corrigió, el cliente recibe la última versión.
      const r = await fetch(`/api/presupuestos/emitidos/${id}/enlace`, { method: "POST" });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error ?? "No se pudo crear el link.");
      const cuerpo = `${texto}\n\n${datos.url}`;
      if (canal === "whatsapp") {
        const destino = `https://wa.me/${telefonoWhatsapp(telefono)}?text=${encodeURIComponent(cuerpo)}`;
        if (ventana) ventana.location.href = destino;
        else window.location.href = destino;
      } else {
        const q = new URLSearchParams({ subject: asunto, body: cuerpo }).toString().replace(/\+/g, "%20");
        window.location.href = `mailto:${mail.trim()}?${q}`;
      }
    } catch (e) {
      ventana?.close();
      setError(e instanceof Error ? e.message : String(e));
    }
    setTrabajando("");
  }

  return (
    <div className="space-y-4 border-t border-borde/60 pt-5">
      <p className="subtitulo text-amarillo">Enviar al cliente</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor="envio-contacto">
            Contacto
          </label>
          <input
            id="envio-contacto"
            value={contacto}
            onChange={(e) => {
              setContacto(e.target.value);
              if (!editado) setTexto(mensajeInicial(e.target.value, numero));
            }}
            className="campo"
          />
        </div>
        <div>
          <label className="etiqueta" htmlFor="envio-tel">
            WhatsApp (con código de país)
          </label>
          <input id="envio-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} type="tel" placeholder="+595 981 123 456" className="campo" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="envio-mail">
            Mail
          </label>
          <input id="envio-mail" value={mail} onChange={(e) => setMail(e.target.value)} type="email" className="campo" />
        </div>
        <div className="sm:col-span-3">
          <label className="etiqueta" htmlFor="envio-texto">
            Mensaje
          </label>
          <textarea
            id="envio-texto"
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
        cliente abre sin usuario y vence a los 7 días.
      </p>
    </div>
  );
}
