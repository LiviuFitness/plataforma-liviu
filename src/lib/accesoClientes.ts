import { createClient } from "@supabase/supabase-js";

/**
 * Clientes que da de alta el entrenador (sin que se registren ellos):
 * tienen cuenta desde el primer momento, para poder montarles rutina y
 * dieta y entrenarles en presencial. Si aún no tienen correo, se les pone
 * uno de relleno con este dominio (no recibe nada) hasta que se les da
 * acceso con el suyo.
 */
export const DOMINIO_SIN_ACCESO = "sin-acceso.livfit.es";

export const esSinAcceso = (email: string | null | undefined) =>
  !email || email.toLowerCase().endsWith(`@${DOMINIO_SIN_ACCESO}`);

export const emailDeRelleno = () => `cliente-${crypto.randomUUID().slice(0, 12)}@${DOMINIO_SIN_ACCESO}`;

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

/**
 * El correo para que cree su contraseña (el mismo que "He olvidado mi
 * contraseña"). Se pide desde el servidor con el flujo "implicit": el
 * enlace trae la sesión en el propio enlace y vale en cualquier móvil
 * (con el flujo normal solo valdría en el navegador que lo pidió).
 */
export async function enviarCorreoAcceso(email: string, origen: string) {
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" },
  });
  return anon.auth.resetPasswordForEmail(email, { redirectTo: `${origen}/restablecer` });
}
