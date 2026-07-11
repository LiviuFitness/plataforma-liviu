import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

/** Cliente de Supabase para componentes y acciones de servidor. */
export async function crearClienteServidor() {
  const almacenCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(cookiesAEstablecer) {
          try {
            cookiesAEstablecer.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component: se puede ignorar si el
            // proxy se encarga de refrescar la sesión.
          }
        },
      },
    }
  );
}

export interface UsuarioSesion {
  id: string;
  email: string;
}

/**
 * Usuario autenticado, memorizado por petición (con `cache` de React).
 * El proxy (src/proxy.ts) ya valida el token contra Supabase en cada
 * petición y reenvía el id/email por cabecera — aquí solo se lee esa
 * cabecera, sin repetir esa misma llamada de red en cada layout/página.
 * Si por lo que sea no llega (desarrollo sin pasar por el proxy, rutas
 * fuera de su matcher…) se verifica de la forma normal como red de seguridad.
 */
export const obtenerUsuario = cache(async (): Promise<UsuarioSesion | null> => {
  const cabeceras = await headers();
  const id = cabeceras.get("x-usuario-id");
  if (id) {
    return { id, email: cabeceras.get("x-usuario-email") ?? "" };
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? "" } : null;
});
