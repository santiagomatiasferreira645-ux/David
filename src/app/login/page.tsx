"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

// Ingreso solo con mail y contraseña. No se mandan mails: el administrador crea cada usuario en Supabase
// con su contraseña, y cada uno la puede cambiar después desde Mi cuenta.
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "error">("");
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const { error } = await clienteNavegador().auth.signInWithPassword({ email: email.trim(), password: contrasena });
    if (error) {
      setError(mensajeError(error.message));
      setEstado("error");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="tarjeta mx-auto mt-12 max-w-sm space-y-5 p-6">
      <div>
        <p className="subtitulo text-amarillo">Acceso restringido</p>
        <h1 className="titulo mt-1">Ingresar</h1>
      </div>
      <div>
        <label className="etiqueta" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="campo" />
      </div>
      <div>
        <label className="etiqueta" htmlFor="contrasena">Contraseña</label>
        <input
          id="contrasena"
          type="password"
          required
          autoComplete="current-password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          className="campo"
        />
      </div>
      <button className="boton w-full" disabled={estado === "enviando"}>
        {estado === "enviando" ? "Entrando..." : "Entrar"}
      </button>
      {estado === "error" && <p className="text-sm text-red-400">{error}</p>}
      <p className="text-center text-sm secundario">¿No tenés usuario o te olvidaste la contraseña? Pedíselo al administrador.</p>
    </form>
  );
}

// Supabase responde en inglés; se traduce lo más común para que el usuario sepa qué hacer.
function mensajeError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes("invalid login credentials")) return "Mail o contraseña incorrectos. Revisá que estén bien escritos.";
  if (e.includes("email not confirmed"))
    return "Tu usuario todavía no está activado. Pedile al administrador que lo confirme en Supabase.";
  if (e.includes("rate limit") || e.includes("too many")) return "Demasiados intentos seguidos. Esperá unos minutos y volvé a intentar.";
  if (e.includes("banned")) return "Este usuario está bloqueado. Hablá con el administrador.";
  if (e.includes("fetch") || e.includes("network")) return "No hay conexión con el servidor. Revisá internet y volvé a intentar.";
  return `No se pudo entrar: ${error}`;
}
