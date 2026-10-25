"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clienteNavegador } from "@/lib/supabase/navegador";

const MINIMO = 8;

// Crear o cambiar la contraseña del usuario que ya entró, y cerrar sesión.
export default function Cuenta() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [repetir, setRepetir] = useState("");
  const [estado, setEstado] = useState<"" | "guardando" | "listo" | "error">("");
  const [error, setError] = useState("");

  useEffect(() => {
    clienteNavegador()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (contrasena.length < MINIMO) return fallar(`La contraseña tiene que tener al menos ${MINIMO} caracteres.`);
    if (contrasena !== repetir) return fallar("Las dos contraseñas no coinciden.");
    setEstado("guardando");
    const { error } = await clienteNavegador().auth.updateUser({ password: contrasena });
    if (error) return fallar(mensajeError(error.message));
    setContrasena("");
    setRepetir("");
    setEstado("listo");
  }

  function fallar(mensaje: string) {
    setError(mensaje);
    setEstado("error");
  }

  async function salir() {
    await clienteNavegador().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-6 max-w-sm space-y-4">
      <form onSubmit={guardar} className="tarjeta space-y-5 p-6">
        <div>
          <p className="subtitulo text-amarillo">Mi cuenta</p>
          <h1 className="titulo mt-1">Contraseña</h1>
          {email && <p className="mt-1 font-mono text-sm secundario">{email}</p>}
        </div>
        <input type="email" value={email} autoComplete="username" readOnly hidden />
        <div>
          <label className="etiqueta" htmlFor="nueva">Contraseña nueva</label>
          <input id="nueva" type="password" required autoComplete="new-password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} className="campo" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="repetir">Repetir contraseña</label>
          <input id="repetir" type="password" required autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} className="campo" />
        </div>
        <button className="boton w-full" disabled={estado === "guardando"}>
          {estado === "guardando" ? "Guardando..." : "Guardar contraseña"}
        </button>
        {estado === "listo" && <p className="text-sm text-emerald-300">Listo. Desde ahora podés entrar con tu mail y esta contraseña.</p>}
        {estado === "error" && <p className="text-sm text-red-400">{error}</p>}
      </form>
      <button onClick={salir} className="boton-secundario w-full">
        Cerrar sesión
      </button>
    </div>
  );
}

function mensajeError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes("different from the old")) return "La contraseña nueva tiene que ser distinta de la anterior.";
  if (e.includes("weak") || e.includes("at least")) return "La contraseña es muy débil. Usá al menos 8 caracteres con letras y números.";
  if (e.includes("reauthentication")) return "Por seguridad, cerrá sesión, entrá con un link por mail y volvé a intentar.";
  return `No se pudo guardar: ${error}`;
}
