import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
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
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icono|apple-icon|marca-agua.png|logos/).*)"],
};
