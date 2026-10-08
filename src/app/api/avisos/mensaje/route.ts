import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio, enviarAvisos, pushDisponible } from "@/lib/push";
import { textoVisible } from "@/lib/guias";
import { resumenMensaje } from "@/lib/fotoChat";

export const dynamic = "force-dynamic";

const recortar = (t: string) => (t.length > 140 ? `${t.slice(0, 137)}…` : t);

/**
 * Aviso de mensaje nuevo en el chat. Lo pide el navegador de quien
 * acaba de escribir, justo después de guardar el mensaje:
 *  · el entrenador → a los clientes que indique;
 *  · un cliente → al entrenador.
 * El texto del aviso se lee de la base de datos (el último mensaje de
 * quien escribe), no del cuerpo de la petición.
 */
export async function POST(request: Request) {
  if (!pushDisponible()) return Response.json({ ok: true, enviados: 0 });
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ ok: false }, { status: 401 });

  const supabase = await crearClienteServidor();
  const { data: yo } = await supabase.from("profiles").select("rol, nombre").eq("id", usuario.id).maybeSingle();
  if (!yo) return Response.json({ ok: false }, { status: 403 });

  const db = clienteServicio();
  let enviados = 0;

  if (yo.rol === "entrenador") {
    const cuerpo = (await request.json().catch(() => ({}))) as { clienteIds?: unknown };
    const ids = Array.isArray(cuerpo.clienteIds)
      ? cuerpo.clienteIds.filter((x): x is string => typeof x === "string").slice(0, 200)
      : [];
    if (ids.length === 0) return Response.json({ ok: true, enviados: 0 });
    const { data: ultimos } = await db
      .from("mensajes")
      .select("cliente_id, texto, imagen, creado_en")
      .in("cliente_id", ids)
      .eq("remitente", "entrenador")
      .gte("creado_en", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order("creado_en", { ascending: false });
    const texto = new Map<string, string>();
    for (const m of ultimos ?? []) {
      if (!texto.has(m.cliente_id)) texto.set(m.cliente_id, resumenMensaje(m.texto, m.imagen));
    }
    /* Para el número del icono: lo que cada uno tiene sin leer */
    const { data: vistos } = await db.from("profiles").select("id, chat_visto_en").in("id", ids);
    const vistoEn = new Map((vistos ?? []).map((p) => [p.id as string, (p.chat_visto_en as string | null) ?? "1970-01-01"]));
    const desde = new Date(Date.now() - 60 * 86_400_000).toISOString();
    const { data: recientes } = await db
      .from("mensajes")
      .select("cliente_id, creado_en")
      .in("cliente_id", ids)
      .eq("remitente", "entrenador")
      .gte("creado_en", desde)
      .limit(5000);
    const sinLeer = new Map<string, number>();
    for (const m of recientes ?? []) {
      if (new Date(m.creado_en) > new Date(vistoEn.get(m.cliente_id) ?? "1970-01-01")) {
        sinLeer.set(m.cliente_id, (sinLeer.get(m.cliente_id) ?? 0) + 1);
      }
    }
    const pila = String(yo.nombre ?? "Tu entrenador").split(" ")[0];
    enviados = await enviarAvisos(ids, "mensajes", (id) =>
      texto.has(id)
        ? {
            titulo: `${pila} te ha escrito`,
            cuerpo: recortar(textoVisible(texto.get(id)!)),
            url: "/chat",
            etiqueta: "chat",
            insignia: sinLeer.get(id) ?? 1,
          }
        : null
    );
  } else {
    const { data: ultimo } = await db
      .from("mensajes")
      .select("texto, imagen")
      .eq("cliente_id", usuario.id)
      .eq("remitente", "cliente")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ultimo) return Response.json({ ok: true, enviados: 0 });
    const { data: entrenadores } = await db.from("profiles").select("id").eq("rol", "entrenador");
    /* Para el número del icono: clientes cuyo último mensaje es suyo (como en el panel) */
    const { data: ultimosHilos } = await db
      .from("mensajes")
      .select("cliente_id, remitente")
      .order("creado_en", { ascending: false })
      .limit(400);
    const hilos = new Set<string>();
    let esperando = 0;
    for (const m of ultimosHilos ?? []) {
      if (hilos.has(m.cliente_id)) continue;
      hilos.add(m.cliente_id);
      if (m.remitente === "cliente") esperando++;
    }
    enviados = await enviarAvisos(
      (entrenadores ?? []).map((e) => e.id as string),
      "mensajes",
      () => ({
        titulo: `${yo.nombre} te ha escrito`,
        cuerpo: recortar(resumenMensaje(textoVisible(ultimo.texto), ultimo.imagen)),
        url: `/clientes/${usuario.id}?vista=chat`,
        etiqueta: `chat-${usuario.id}`,
        insignia: Math.max(1, esperando),
      })
    );
  }
  return Response.json({ ok: true, enviados });
}
