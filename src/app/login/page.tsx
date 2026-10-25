"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

// Ingreso con mail y contraseña. El link por mail queda para la primera vez o si se olvidó la contraseña:
// entra y lleva a Mi cuenta para crear una nueva.
export default function Login() {
  const router = useRouter();
  const [modo, setModo] = useState<"contrasena" | "link">("contrasena");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [estado, setEstado] = useState<"" | "enviando" | "enviado" | "error">("");
  const [error, setError] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    const auth = clienteNavegador().auth;
    const { error } =
      modo === "contrasena"
        ? await auth.signInWithPassword({ email, password: contrasena })
        : await auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback?siguiente=/cuenta`, shouldCreateUser: false },
          });
    if (error) {
      setError(error.message);
      setEstado("error");
    } else if (modo === "contrasena") {
      router.replace("/");
      router.refresh();
    } else setEstado("enviado");
  }

  function cambiarModo(m: typeof modo) {
    setModo(m);
    setEstado("");
  }

  return (
    <form onSubmit={enviar} className="tarjeta mx-auto mt-12 max-w-sm space-y-5 p-6">
      <div>
        <p className="subtitulo text-acento">Acceso restringido</p>
        <h1 className="titulo mt-1">Ingresar</h1>
      </div>
      {estado === "enviado" ? (
        <p className="text-slate-300">
          Te mandamos un link a {email}. Abrilo desde este mismo dispositivo; te va a llevar a crear tu contraseña.
        </p>
      ) : (
        <>
          <div>
            <label className="etiqueta" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="campo" />
          </div>
          {modo === "contrasena" && (
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
          )}
          <button className="boton w-full" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Entrando..." : modo === "contrasena" ? "Entrar" : "Enviarme el link de acceso"}
          </button>
          {estado === "error" && <p className="text-sm text-red-400">{mensajeError(error, modo)}</p>}
          <p className="text-center text-sm secundario">
            {modo === "contrasena" ? (
              <>
                ¿Primera vez o te olvidaste la contraseña?{" "}
                <button type="button" onClick={() => cambiarModo("link")} className="enlace">
                  Entrar con un link por mail
                </button>
              </>
            ) : (
              <button type="button" onClick={() => cambiarModo("contrasena")} className="enlace">
                Entrar con contraseña
              </button>
            )}
          </p>
        </>
      )}
    </form>
  );
}

// Supabase responde en inglés; se traduce lo más común para que el usuario sepa qué hacer.
function mensajeError(error: string, modo: "contrasena" | "link"): string {
  const e = error.toLowerCase();
  if (e.includes("invalid login credentials"))
    return "Mail o contraseña incorrectos. Si todavía no creaste tu contraseña, entrá con un link por mail.";
  if (e.includes("rate limit")) return "Demasiados intentos seguidos. Esperá unos minutos y volvé a intentar.";
  if (e.includes("signups not allowed") || e.includes("not found")) return "Este mail no está habilitado. Pedile al administrador que te cargue como usuario.";
  return `${modo === "contrasena" ? "No se pudo entrar" : "No se pudo enviar el link"}: ${error}`;
}
