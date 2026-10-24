"use client";

import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

// Ingreso sin contraseña: Supabase manda un link al mail del usuario.
export default function Login() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "enviado" | "error">("");
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const { error } = await clienteNavegador().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback`, shouldCreateUser: false },
    });
    if (error) {
      setError(error.message);
      setEstado("error");
    } else setEstado("enviado");
  }

  return (
    <form onSubmit={enviar} className="tarjeta mx-auto mt-12 max-w-sm space-y-5 p-6">
      <div>
        <p className="subtitulo text-acento">Acceso restringido</p>
        <h1 className="titulo mt-1">Ingresar</h1>
      </div>
      {estado === "enviado" ? (
        <p className="text-slate-300">Te mandamos un link a {email}. Abrilo desde este mismo dispositivo para entrar.</p>
      ) : (
        <>
          <div>
            <label className="etiqueta" htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="campo" />
          </div>
          <button className="boton w-full" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando..." : "Enviarme el link de acceso"}
          </button>
          {estado === "error" && <p className="text-sm text-red-400">{mensajeError(error)}</p>}
        </>
      )}
    </form>
  );
}

// Supabase responde en inglés; se traduce lo más común para que el usuario sepa qué hacer.
function mensajeError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes("rate limit")) return "Se pidieron demasiados links seguidos. Esperá unos minutos y volvé a intentar.";
  if (e.includes("signups not allowed") || e.includes("not found")) return "Este mail no está habilitado. Pedile al administrador que te cargue como usuario.";
  return `No se pudo enviar el link: ${error}`;
}
