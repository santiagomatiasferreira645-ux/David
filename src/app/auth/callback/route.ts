import { NextResponse } from "next/server";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) await clienteServidor().auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/", url.origin));
}
