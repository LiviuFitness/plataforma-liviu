import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/servidor";

/**
 * Callback de OAuth (Google): intercambia el código por una sesión.
 * Si el usuario es nuevo y no tiene invitación, el trigger de la base
 * de datos rechaza el alta y volvemos al login con un mensaje claro.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const codigo = url.searchParams.get("code");

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) {
      return NextResponse.redirect(new URL("/hoy", url.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=google", url.origin));
}
