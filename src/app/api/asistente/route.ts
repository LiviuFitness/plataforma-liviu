import type Anthropic from "@anthropic-ai/sdk";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/push";
import { FORMATO_RESPUESTA, INSTRUCCIONES, LIMITE_DIARIO, type AlternativaAsistente, type MensajeAsistente } from "@/lib/asistenteDieta";
import { CAMPOS_ASISTENTE, guardarConversacion, limiteAgotado, preguntasDeHoy } from "@/lib/asistenteServidor";
import { cargarContextoCliente } from "@/lib/contextoIA";
import { iaActiva, MODELO_IA, pedirIA } from "@/lib/ia";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** Para el entrenador: ¿el servidor puede guardar las conversaciones?
 * (si la clave de servicio de Vercel está mal, la IA responde pero no se
 * guarda nada). Dice qué tipo de clave es, sin enseñarla. */
async function diagnostico() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let tipo = "no está puesta";
  if (clave.startsWith("sb_secret_")) tipo = "clave secreta (correcta)";
  else if (clave.startsWith("sb_publishable_")) tipo = "clave PÚBLICA (incorrecta: hay que poner la secreta)";
  else if (clave.split(".").length === 3) {
    try {
      const rol = JSON.parse(Buffer.from(clave.split(".")[1], "base64url").toString()).role;
      tipo = rol === "service_role" ? "service_role (correcta)" : `rol "${rol}" (incorrecta: hay que poner la service_role)`;
    } catch {
      tipo = "no se puede leer";
    }
  } else if (clave) tipo = "formato desconocido";
  const { count, error } = await clienteServicio()
    .from("asistente_mensajes")
    .select("id", { count: "exact", head: true });
  return {
    clave_servicio: tipo,
    lectura: error ? `ERROR: ${error.message}` : `ok (${count ?? 0} mensajes guardados en total)`,
    modelo: MODELO_IA,
  };
}

/** La conversación del cliente (las últimas 60) y cuántas preguntas le quedan hoy */
export async function GET() {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const supabase = await crearClienteServidor();
  const { data: yo } = await supabase.from("profiles").select("rol").eq("id", usuario.id).maybeSingle();
  if (yo?.rol === "entrenador") return Response.json(await diagnostico());
  const [{ data }, usadas] = await Promise.all([
    supabase
      .from("asistente_mensajes")
      .select(CAMPOS_ASISTENTE)
      .eq("cliente_id", usuario.id)
      .order("creado_en", { ascending: false })
      .limit(60),
    preguntasDeHoy(usuario.id),
  ]);
  return Response.json({
    mensajes: ((data ?? []) as MensajeAsistente[]).reverse(),
    restantes: Math.max(0, LIMITE_DIARIO - usadas),
    activo: iaActiva(),
  });
}

/** Una pregunta nueva: se contesta con su dieta delante y se guardan las dos */
export async function POST(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (!iaActiva()) return Response.json({ error: "El asistente todavía no está activado." }, { status: 503 });

  const cuerpo = (await request.json().catch(() => ({}))) as { texto?: unknown; imagen?: unknown };
  /* Foto opcional (la carta, un plato, una etiqueta): JPEG en base64, ya
   * reducida en el móvil. No se guarda: solo se usa para responder. */
  const imagen =
    typeof cuerpo.imagen === "string" && /^[A-Za-z0-9+/=]+$/.test(cuerpo.imagen) && cuerpo.imagen.length < 3_000_000
      ? cuerpo.imagen
      : null;
  const escrito = typeof cuerpo.texto === "string" ? cuerpo.texto.trim().slice(0, 800) : "";
  if (!escrito && !imagen) return Response.json({ error: "Escribe tu pregunta." }, { status: 400 });
  const pregunta = imagen ? `📷 ${escrito || "¿Qué me recomiendas con esto?"}` : escrito;

  const supabase = await crearClienteServidor();
  const { data: perfil } = await supabase.from("profiles").select("rol").eq("id", usuario.id).maybeSingle();
  if (perfil?.rol !== "cliente") return Response.json({ error: "Solo para clientes." }, { status: 403 });

  const usadas = await preguntasDeHoy(usuario.id);
  if (usadas >= LIMITE_DIARIO) return limiteAgotado();

  const [ctx, { data: previos }] = await Promise.all([
    cargarContextoCliente(supabase, usuario.id),
    supabase
      .from("asistente_mensajes")
      .select(CAMPOS_ASISTENTE)
      .eq("cliente_id", usuario.id)
      .gte("creado_en", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .order("creado_en", { ascending: false })
      .limit(12),
  ]);
  if (!ctx) return Response.json({ error: "No se ha encontrado tu perfil." }, { status: 404 });

  /* Lo último que hablaron (hasta 24 h), para que entienda "¿y si…?" */
  const historial: Anthropic.Beta.BetaMessageParam[] = ((previos ?? []) as MensajeAsistente[])
    .reverse()
    .map((m) => ({
      role: m.rol === "cliente" ? ("user" as const) : ("assistant" as const),
      content:
        m.rol === "cliente"
          ? m.texto
          : [m.texto, ...(m.alternativas ?? []).map((a) => `· ${a.nombre}: ${a.cantidad}`)].join("\n"),
    }));
  while (historial.length > 0 && historial[0].role !== "user") historial.shift();

  const r = await pedirIA<{ respuesta: string; alternativas: AlternativaAsistente[]; derivar: boolean }>({
    etiqueta: imagen ? "asistente-foto" : "asistente",
    /* Con foto (una carta, una etiqueta) piensa más; para cambiar un
     * alimento o una duda normal, "medium" responde igual de bien y gasta
     * bastante menos. Fijo por tipo, para no romper la caché. */
    effort: imagen ? "high" : "medium",
    schema: FORMATO_RESPUESTA,
    system: [
      /* Instrucciones y catálogo: iguales para todos, se cachean */
      { type: "text", text: INSTRUCCIONES },
      { type: "text", text: ctx.textoCatalogo, cache_control: { type: "ephemeral" } },
      /* Lo de este cliente: igual durante toda su conversación */
      { type: "text", text: ctx.estable, cache_control: { type: "ephemeral" } },
      /* Lo que cambia durante el día (hora, comidas hechas): sin caché */
      { type: "text", text: ctx.hoy },
    ],
    messages: [
      ...historial,
      {
        role: "user",
        content: imagen
          ? [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imagen } },
              { type: "text", text: escrito || "¿Qué me recomiendas con esto, según mi dieta?" },
            ]
          : escrito,
      },
    ],
  });

  let respuesta: { respuesta: string; alternativas: AlternativaAsistente[]; derivar: boolean };
  if (!r.ok && r.rechazo) {
    respuesta = { respuesta: "Esa no te la puedo responder yo. Pregúntasela a Liviu, que te contesta él. 💪", alternativas: [], derivar: true };
  } else if (!r.ok || typeof r.datos.respuesta !== "string" || !r.datos.respuesta.trim()) {
    return Response.json({ error: "El asistente no ha podido responder ahora. Prueba otra vez en un momento." }, { status: 502 });
  } else {
    respuesta = {
      respuesta: r.datos.respuesta.trim(),
      alternativas: Array.isArray(r.datos.alternativas) ? r.datos.alternativas.slice(0, 4) : [],
      derivar: r.datos.derivar === true,
    };
  }

  const guardado = await guardarConversacion(usuario.id, pregunta, respuesta);
  return Response.json({ ...guardado, restantes: Math.max(0, LIMITE_DIARIO - usadas - 1) });
}
