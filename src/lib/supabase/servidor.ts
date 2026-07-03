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
