import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

/**
 * Usuario autenticado, memorizado por petición (con `cache` de React).
 * El layout y la página de cada ruta necesitan saber quién ha iniciado
 * sesión; sin este cache, `auth.getUser()` — que valida el token contra
 * el servidor de Supabase, no es una simple lectura de cookie — se
 * repetía dos veces por navegación y frenaba cada cambio de página.
 */
export const obtenerUsuario = cache(async () => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
