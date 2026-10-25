"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ImagenPn } from "@/lib/imagenes";
import { normalizarPn } from "@/lib/pn";
import { clienteNavegador } from "@/lib/supabase/navegador";

const BUCKET = "imagenes-pn";
const LADO_MAXIMO = 1600;

// Las fotos del celular pesan varios MB: se achican a 1600 px en JPEG antes de subirlas.
async function achicar(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo leer la imagen."))), "image/jpeg", 0.85));
}

export function ImagenesPn({ pn, imagenes }: { pn: string; imagenes: ImagenPn[] }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function subir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!archivos.length) return;
    setSubiendo(true);
    setError("");
    const storage = clienteNavegador().storage.from(BUCKET);
    for (const archivo of archivos) {
      try {
        const blob = await achicar(archivo);
        const ruta = `${normalizarPn(pn)}/${Date.now()}.jpg`;
        const { error } = await storage.upload(ruta, blob, { contentType: "image/jpeg" });
        if (error) throw error;
      } catch (err) {
        setError(mensajeError(err instanceof Error ? err.message : String(err)));
        break;
      }
    }
    setSubiendo(false);
    router.refresh();
  }

  async function borrar(ruta: string) {
    if (!confirm("¿Borrar esta imagen?")) return;
    const { error } = await clienteNavegador().storage.from(BUCKET).remove([ruta]);
    if (error) setError(mensajeError(error.message));
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {imagenes.map((img) => (
          <div key={img.ruta} className="group relative">
            <a href={img.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={`Referencia ${pn}`} className="h-20 w-20 rounded-md border border-borde object-cover hover:border-acento" />
            </a>
            <button
              onClick={() => borrar(img.ruta)}
              aria-label="Borrar imagen"
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white sm:hidden sm:group-hover:flex"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => entrada.current?.click()}
          disabled={subiendo}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-borde text-xs text-apagado hover:border-acento hover:text-acento"
        >
          {subiendo ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-acento border-t-transparent" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              {imagenes.length ? "Agregar" : "Agregar foto"}
            </>
          )}
        </button>
        <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={subir} />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

function mensajeError(error: string): string {
  const e = error.toLowerCase();
  if (e.includes("bucket not found")) return "Falta crear el espacio de imágenes en Supabase (archivo 4_imagenes_pn.sql).";
  if (e.includes("row-level security") || e.includes("unauthorized")) return "No tenés permiso para subir imágenes. Volvé a iniciar sesión.";
  return `No se pudo guardar la imagen: ${error}`;
}
