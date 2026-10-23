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
    <form onSubmit={enviar} className="tarjeta mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-bold">Ingresar</h1>
      {estado === "enviado" ? (
        <p>Te mandamos un link a {email}. Abrilo desde este mismo dispositivo para entrar.</p>
      ) : (
        <>
          <div>
            <label className="etiqueta" htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="campo" />
          </div>
          <button className="boton w-full" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Enviando..." : "Enviarme el link de acceso"}
          </button>
          {estado === "error" && <p className="text-sm text-red-700">No se pudo enviar: {error}. Sólo pueden entrar usuarios invitados.</p>}
        </>
      )}
    </form>
  );
}
