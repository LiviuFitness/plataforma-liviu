import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio, enviarAvisos, pushDisponible } from "@/lib/push";

export const dynamic = "force-dynamic";

const EMOJI: Record<string, string> = { fuego: "🔥", fuerza: "💪", aplauso: "👏" };

/**
 * Aviso al autor de un entreno compartido cuando alguien reacciona. Se
 * comprueba en la base de datos que la reacción existe de verdad (no se
 * fía del cuerpo de la petición). Los avisos del mismo entreno llevan la
 * misma etiqueta: se sustituyen en vez de amontonarse.
 */
export async function POST(request: Request) {
  if (!pushDisponible()) return Response.json({ ok: true });
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ ok: false }, { status: 401 });

  const { entrenoId, tipo } = (await request.json().catch(() => ({}))) as { entrenoId?: string; tipo?: string };
  if (!entrenoId || !tipo || !(tipo in EMOJI)) return Response.json({ ok: false }, { status: 400 });

  const supabase = await crearClienteServidor();
  const { data: reaccion } = await supabase
    .from("reacciones_entreno")
    .select("tipo")
    .eq("entreno_id", entrenoId)
    .eq("cliente_id", usuario.id)
    .eq("tipo", tipo)
    .maybeSingle();
  if (!reaccion) return Response.json({ ok: true });

  const db = clienteServicio();
  const [{ data: entreno }, { data: yo }] = await Promise.all([
    db.from("entrenos_compartidos").select("cliente_id, nombre_dia").eq("id", entrenoId).maybeSingle(),
    db.from("profiles").select("nombre").eq("id", usuario.id).maybeSingle(),
  ]);
  if (!entreno || entreno.cliente_id === usuario.id) return Response.json({ ok: true });

  const pila = String(yo?.nombre ?? "Alguien").split(" ")[0];
  await enviarAvisos([entreno.cliente_id as string], "comunidad", () => ({
    titulo: `${EMOJI[tipo]} A ${pila} le ha encantado tu entreno`,
    cuerpo: `${entreno.nombre_dia}: mira quién más te ha reaccionado`,
    url: "/comunidad",
    etiqueta: `reaccion-${entrenoId}`,
  })).catch(() => 0);
  return Response.json({ ok: true });
}
