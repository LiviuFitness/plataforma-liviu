/**
 * Latido para que Supabase no pause el proyecto.
 *
 * Los proyectos del plan gratuito se pausan tras 7 días sin actividad, y
 * al pausarse su subdominio deja de resolver: la app sigue sirviéndose
 * desde Vercel pero nadie puede iniciar sesión. Ya pasó una vez (7 sep
 * 2026) y solo se detectó porque Liviu fue a entrar.
 *
 * Lo llama un cron diario de Vercel (ver `vercel.json`). No basta con
 * tocar el dominio: la petición tiene que llegar a la base de datos para
 * que cuente como actividad, así que se hace una consulta de verdad.
 *
 * OJO: esto es un apaño, no una garantía. La única forma fiable de que
 * un proyecto no se pause es el plan Pro de Supabase.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel manda `Authorization: Bearer $CRON_SECRET` si la variable
  // existe. Se comprueba solo si está definida, para que el ping siga
  // funcionando aunque no se llegue a configurar.
  const secreto = process.env.CRON_SECRET;
  if (secreto && request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !clave) {
    return Response.json(
      { ok: false, error: "Faltan las variables de Supabase" },
      { status: 500 }
    );
  }

  // Consulta mínima contra PostgREST. Se pide `head` y un rango de una
  // fila: no interesa el contenido (las políticas RLS devolverán vacío
  // sin sesión), solo que la consulta llegue a Postgres.
  const inicio = Date.now();
  try {
    const respuesta = await fetch(`${url}/rest/v1/ejercicios?select=id&limit=1`, {
      headers: { apikey: clave, Authorization: `Bearer ${clave}` },
      cache: "no-store",
    });

    return Response.json({
      ok: respuesta.ok,
      estado: respuesta.status,
      ms: Date.now() - inicio,
      momento: new Date().toISOString(),
    });
  } catch (error) {
    // Si esto falla, el proyecto probablemente esté pausado o caído: se
    // devuelve 503 para que se note en los registros de Vercel en vez de
    // pasar en silencio.
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Sin respuesta de Supabase",
        momento: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
