import { obtenerUsuario, crearClienteServidor } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/push";
import { emailDeRelleno, emailValido, enviarCorreoAcceso } from "@/lib/accesoClientes";

export const dynamic = "force-dynamic";

/**
 * El entrenador da de alta a un cliente él mismo. Se crea una invitación
 * y, con ella, la cuenta (el trigger de la base de datos crea el perfil
 * a partir de la invitación, como en un alta normal). Con correo, además
 * le llega el email para crear su contraseña; sin correo, lo lleva el
 * entrenador hasta que le dé acceso.
 */
export async function POST(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const supabase = await crearClienteServidor();
  const { data: yo } = await supabase.from("profiles").select("rol").eq("id", usuario.id).maybeSingle();
  if (yo?.rol !== "entrenador") return Response.json({ error: "Solo el entrenador" }, { status: 403 });

  const cuerpo = (await request.json().catch(() => ({}))) as {
    nombre?: string;
    objetivo?: string | null;
    plan?: string | null;
    email?: string;
  };
  const nombre = String(cuerpo.nombre ?? "").trim().slice(0, 80);
  if (!nombre) return Response.json({ error: "Escribe su nombre." }, { status: 400 });
  const correo = String(cuerpo.email ?? "").trim().toLowerCase();
  if (correo && !emailValido(correo)) return Response.json({ error: "Ese correo no parece válido." }, { status: 400 });
  const plan = cuerpo.plan === "mensual" || cuerpo.plan === "trimestral" ? cuerpo.plan : null;
  const objetivo = cuerpo.objetivo ? String(cuerpo.objetivo).slice(0, 60) : null;
  const email = correo || emailDeRelleno();

  const db = clienteServicio();
  const { data: inv, error: e1 } = await db
    .from("invitaciones")
    .insert({ nombre, email, objetivo, plan, creada_por: usuario.id })
    .select("token")
    .single();
  if (e1 || !inv) return Response.json({ error: "No se ha podido crear. Inténtalo de nuevo." }, { status: 500 });

  const { data: creado, error: e2 } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nombre, invitacion: inv.token },
  });
  if (e2 || !creado.user) {
    await db.from("invitaciones").delete().eq("token", inv.token);
    const yaExiste = /already|registered|exists/i.test(e2?.message ?? "");
    return Response.json(
      { error: yaExiste ? "Ya hay una cuenta con ese correo." : "No se ha podido crear. Inténtalo de nuevo." },
      { status: yaExiste ? 409 : 500 }
    );
  }

  let correoEnviado = false;
  if (correo) {
    const { error: e3 } = await enviarCorreoAcceso(correo, new URL(request.url).origin);
    correoEnviado = !e3;
  }
  return Response.json({ id: creado.user.id, correoEnviado });
}
