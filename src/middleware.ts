import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_MODULO, moduloDeRuta } from "@/lib/modulos";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

const PUBLICAS = ["/login", "/auth", "/configurar"];

export async function middleware(request: NextRequest) {
  const ruta = request.nextUrl.pathname;
  if (!supabaseConfigurado) {
    return ruta.startsWith("/configurar") ? NextResponse.next() : NextResponse.redirect(new URL("/configurar", request.url));
  }

  let respuesta = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !PUBLICAS.some((p) => ruta.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  // Recordar el último módulo usado para ofrecer "Seguir en …" en el inicio.
  const modulo = moduloDeRuta(ruta);
  if (user && modulo?.disponible && request.cookies.get(COOKIE_MODULO)?.value !== modulo.id) {
    respuesta.cookies.set(COOKIE_MODULO, modulo.id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 60 });
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icono.svg|marca-agua.png|logos/).*)"],
};
