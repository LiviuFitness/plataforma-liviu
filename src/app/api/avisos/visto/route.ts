import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio, enviarAvisos, pushDisponible } from "@/lib/push";

export const dynamic = "force-dynamic";

const EMOJI: Record<string, string> = { fuego: "🔥", fuerza: "💪", aplauso: "👏" };

/**
 * «Liviu ha visto tu entreno»: aviso al cliente cuando el entrenador
 * reacciona a una sesión o le deja una nota de voz. Lo que dice el aviso
 * se lee de la sesión guardada, no del cuerpo de la petición. La misma
 * etiqueta por sesión: si reacciona y luego graba, el segundo aviso
 * sustituye al primero.
 */
export async function POST(request: Request) {
  if (!pushDisponible()) return Response.json({ ok: true });
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ ok: false }, { status: 401 });

  const supabase = await crearClienteServidor();
  const { data: yo } = await supabase.from("profiles").select("rol, nombre").eq("id", usuario.id).maybeSingle();
  if (yo?.rol !== "entrenador") return Response.json({ ok: false }, { status: 403 });

  const { sesionId } = (await request.json().catch(() => ({}))) as { sesionId?: string };
  if (!sesionId) return Response.json({ ok: false }, { status: 400 });

  const { data: sesion } = await clienteServicio()
    .from("sesiones")
    .select("cliente_id, vista_en, reaccion_entrenador, nota_voz, rutina_dias ( nombre )")
    .eq("id", sesionId)
    .maybeSingle();
  if (!sesion?.vista_en || (!sesion.reaccion_entrenador && !sesion.nota_voz)) return Response.json({ ok: true });

  const dia = (sesion.rutina_dias as unknown as { nombre: string } | null)?.nombre ?? "entreno";
  const pila = String(yo.nombre ?? "Tu entrenador").split(" ")[0];
  const emoji = sesion.reaccion_entrenador ? `${EMOJI[sesion.reaccion_entrenador as string] ?? ""} ` : "";
  await enviarAvisos([sesion.cliente_id as string], "mensajes", () => ({
    titulo: `${emoji}${pila} ha visto tu ${dia}`,
    cuerpo: sesion.nota_voz ? "Te ha dejado una nota de voz" : "Toca para verlo",
    url: "/inicio",
    etiqueta: `visto-${sesionId}`,
  })).catch(() => 0);
  return Response.json({ ok: true });
}
