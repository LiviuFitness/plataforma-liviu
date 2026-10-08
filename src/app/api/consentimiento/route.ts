import { obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * El cliente acepta términos, privacidad y el tratamiento de sus datos de
 * salud (art. 9 RGPD) y elige si aparece en la comunidad. Lo guarda el
 * servidor porque el cliente no puede escribir en su perfil. La fecha del
 * consentimiento no se pisa si ya existía.
 */
export async function POST(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const { terminos, salud, comunidad } = (await request.json().catch(() => ({}))) as {
    terminos?: boolean;
    salud?: boolean;
    comunidad?: boolean;
  };
  if (terminos !== true || salud !== true) {
    return Response.json({ error: "Hay que aceptar las dos casillas." }, { status: 400 });
  }

  const db = clienteServicio();
  const { data: perfil } = await db.from("profiles").select("rol, consentimiento_salud").eq("id", usuario.id).maybeSingle();
  if (perfil?.rol !== "cliente") return Response.json({ error: "Solo clientes" }, { status: 403 });

  const { error } = await db
    .from("profiles")
    .update({
      consentimiento_salud: perfil.consentimiento_salud ?? new Date().toISOString(),
      visible_en_comunidad: comunidad === true,
    })
    .eq("id", usuario.id);
  if (error) return Response.json({ error: "No se ha podido guardar. Inténtalo de nuevo." }, { status: 500 });
  return Response.json({ ok: true });
}
