import { obtenerUsuario, crearClienteServidor } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/push";
import { emailValido, enviarCorreoAcceso, esSinAcceso } from "@/lib/accesoClientes";

export const dynamic = "force-dynamic";

/**
 * Darle acceso a la app a un cliente que dio de alta el entrenador: se
 * le pone su correo (si aún tenía el de relleno o se cambia) y le llega
 * el email para crear su contraseña. Sirve también para reenviarlo.
 */
export async function POST(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const supabase = await crearClienteServidor();
  const { data: yo } = await supabase.from("profiles").select("rol").eq("id", usuario.id).maybeSingle();
  if (yo?.rol !== "entrenador") return Response.json({ error: "Solo el entrenador" }, { status: 403 });

  const { clienteId, email } = (await request.json().catch(() => ({}))) as { clienteId?: string; email?: string };
  const correo = String(email ?? "").trim().toLowerCase();
  if (!clienteId || !emailValido(correo) || esSinAcceso(correo)) {
    return Response.json({ error: "Escribe un correo válido." }, { status: 400 });
  }

  const db = clienteServicio();
  const { data: perfil } = await db.from("profiles").select("rol, email").eq("id", clienteId).maybeSingle();
  if (perfil?.rol !== "cliente") return Response.json({ error: "Cliente no encontrado" }, { status: 404 });

  if (String(perfil.email).toLowerCase() !== correo) {
    const { error: e1 } = await db.auth.admin.updateUserById(clienteId, { email: correo, email_confirm: true });
    if (e1) {
      const yaExiste = /already|registered|exists/i.test(e1.message);
      return Response.json(
        { error: yaExiste ? "Ya hay otra cuenta con ese correo." : "No se ha podido guardar el correo." },
        { status: yaExiste ? 409 : 500 }
      );
    }
    await db.from("profiles").update({ email: correo }).eq("id", clienteId);
  }

  const { error: e2 } = await enviarCorreoAcceso(correo, new URL(request.url).origin);
  if (e2) {
    const limite = /rate|limit|seconds/i.test(e2.message);
    return Response.json(
      {
        error: limite
          ? "Correo guardado, pero ahora mismo no se pueden enviar más emails (límite por hora). Prueba a reenviarlo en un rato."
          : "Correo guardado, pero no se ha podido enviar el email. Prueba a reenviarlo.",
      },
      { status: 502 }
    );
  }
  return Response.json({ ok: true });
}
