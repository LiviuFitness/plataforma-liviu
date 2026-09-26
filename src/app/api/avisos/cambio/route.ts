import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio, enviarAvisos, pushDisponible } from "@/lib/push";

export const dynamic = "force-dynamic";

const PAUSA_MS = 30 * 60 * 1000;

/**
 * "Liviu ha actualizado tu rutina/dieta". Lo pide el panel del
 * entrenador al guardar. Como mucho uno cada 30 minutos por cliente
 * (profiles.aviso_cambios_en), para que editar cinco días seguidos no
 * sean cinco notificaciones.
 */
export async function POST(request: Request) {
  if (!pushDisponible()) return Response.json({ ok: true, enviados: 0 });
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ ok: false }, { status: 401 });
  const supabase = await crearClienteServidor();
  const { data: yo } = await supabase.from("profiles").select("rol, nombre").eq("id", usuario.id).maybeSingle();
  if (yo?.rol !== "entrenador") return Response.json({ ok: false }, { status: 403 });

  const cuerpo = (await request.json().catch(() => ({}))) as { clienteId?: unknown; que?: unknown };
  const clienteId = typeof cuerpo.clienteId === "string" ? cuerpo.clienteId : null;
  const que = cuerpo.que === "dieta" ? "dieta" : "rutina";
  if (!clienteId) return Response.json({ ok: false }, { status: 400 });

  const db = clienteServicio();
  const { data: cliente } = await db
    .from("profiles")
    .select("aviso_cambios_en, rol")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente || cliente.rol !== "cliente") return Response.json({ ok: false }, { status: 404 });
  const ultimo = cliente.aviso_cambios_en ? new Date(cliente.aviso_cambios_en).getTime() : 0;
  if (Date.now() - ultimo < PAUSA_MS) return Response.json({ ok: true, enviados: 0, motivo: "reciente" });

  const pila = String(yo.nombre ?? "Tu entrenador").split(" ")[0];
  const enviados = await enviarAvisos([clienteId], "cambios", () => ({
    titulo: `${pila} ha actualizado tu ${que}`,
    cuerpo: que === "dieta" ? "Échale un vistazo antes de tu próxima comida." : "Mira qué ha cambiado antes de entrenar.",
    url: que === "dieta" ? "/mi-dieta" : "/mi-rutina",
    etiqueta: `cambio-${que}`,
  }));
  await db.from("profiles").update({ aviso_cambios_en: new Date().toISOString() }).eq("id", clienteId);
  return Response.json({ ok: true, enviados });
}
