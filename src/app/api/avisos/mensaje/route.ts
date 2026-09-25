import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio, enviarAvisos, pushDisponible } from "@/lib/push";
import { textoVisible } from "@/lib/guias";

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
      .select("cliente_id, texto, creado_en")
      .in("cliente_id", ids)
      .eq("remitente", "entrenador")
      .gte("creado_en", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order("creado_en", { ascending: false });
    const texto = new Map<string, string>();
    for (const m of ultimos ?? []) if (!texto.has(m.cliente_id)) texto.set(m.cliente_id, m.texto);
    const pila = String(yo.nombre ?? "Tu entrenador").split(" ")[0];
    enviados = await enviarAvisos(ids, "mensajes", (id) =>
      texto.has(id)
        ? {
            titulo: `${pila} te ha escrito`,
            cuerpo: recortar(textoVisible(texto.get(id)!)),
            url: "/chat",
            etiqueta: "chat",
          }
        : null
    );
  } else {
    const { data: ultimo } = await db
      .from("mensajes")
      .select("texto")
      .eq("cliente_id", usuario.id)
      .eq("remitente", "cliente")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!ultimo) return Response.json({ ok: true, enviados: 0 });
    const { data: entrenadores } = await db.from("profiles").select("id").eq("rol", "entrenador");
    enviados = await enviarAvisos(
      (entrenadores ?? []).map((e) => e.id as string),
      "mensajes",
      () => ({
        titulo: `${yo.nombre} te ha escrito`,
        cuerpo: recortar(textoVisible(ultimo.texto)),
        url: `/clientes/${usuario.id}?vista=chat`,
        etiqueta: `chat-${usuario.id}`,
      })
    );
  }
  return Response.json({ ok: true, enviados });
}
