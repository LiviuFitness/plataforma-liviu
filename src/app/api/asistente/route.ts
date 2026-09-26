import Anthropic from "@anthropic-ai/sdk";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/push";
import { SELECT_DIETA_COMPLETA, type Alimento, type Alternativa, type ComidaEstructurada } from "@/lib/dietas";
import type { Dieta } from "@/lib/tipos";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";
import {
  FORMATO_RESPUESTA,
  INSTRUCCIONES,
  LIMITE_DIARIO,
  inicioDiaMadrid,
  textoCatalogo,
  textoCliente,
  textoHoy,
  type AlternativaAsistente,
  type MensajeAsistente,
} from "@/lib/asistenteDieta";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const MODELO = "claude-opus-5";
const CAMPOS = "id, rol, texto, alternativas, derivado, creado_en";

async function preguntasDeHoy(clienteId: string): Promise<number> {
  const { count } = await clienteServicio()
    .from("asistente_mensajes")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId)
    .eq("rol", "cliente")
    .gte("creado_en", inicioDiaMadrid().toISOString());
  return count ?? 0;
}

/** La conversación del cliente (las últimas 60) y cuántas preguntas le quedan hoy */
export async function GET() {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ error: "Sin sesión" }, { status: 401 });
  const supabase = await crearClienteServidor();
  const [{ data }, usadas] = await Promise.all([
    supabase
      .from("asistente_mensajes")
      .select(CAMPOS)
      .eq("cliente_id", usuario.id)
      .order("creado_en", { ascending: false })
      .limit(60),
    preguntasDeHoy(usuario.id),
  ]);
  return Response.json({
    mensajes: ((data ?? []) as MensajeAsistente[]).reverse(),
    restantes: Math.max(0, LIMITE_DIARIO - usadas),
    activo: !!process.env.ANTHROPIC_API_KEY,
  });
}

/** Una pregunta nueva: se contesta con su dieta delante y se guardan las dos */
export async function POST(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "El asistente todavía no está activado." }, { status: 503 });
  }

  const cuerpo = (await request.json().catch(() => ({}))) as { texto?: unknown; imagen?: unknown };
  /* Foto opcional (la carta, un plato, una etiqueta): JPEG en base64, ya
   * reducida en el móvil. No se guarda: solo se usa para responder. */
  const imagen =
    typeof cuerpo.imagen === "string" && /^[A-Za-z0-9+/=]+$/.test(cuerpo.imagen) && cuerpo.imagen.length < 3_000_000
      ? cuerpo.imagen
      : null;
  const escrito = typeof cuerpo.texto === "string" ? cuerpo.texto.trim().slice(0, 600) : "";
  if (!escrito && !imagen) return Response.json({ error: "Escribe tu pregunta." }, { status: 400 });
  const pregunta = imagen ? `📷 ${escrito || "¿Qué me recomiendas con esto?"}` : escrito;

  const supabase = await crearClienteServidor();
  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, nombre, objetivo, sexo")
    .eq("id", usuario.id)
    .maybeSingle();
  if (!perfil || perfil.rol !== "cliente") return Response.json({ error: "Solo para clientes." }, { status: 403 });

  const usadas = await preguntasDeHoy(usuario.id);
  if (usadas >= LIMITE_DIARIO) {
    return Response.json(
      { error: "Por hoy ya has hecho todas tus preguntas. Mañana más, o escríbele a Liviu por el chat.", restantes: 0 },
      { status: 429 }
    );
  }

  /* Lo que sabe: su dieta, sus equivalencias, lo que no come y el catálogo */
  const dietaDe = (tipo: "entreno" | "descanso") =>
    supabase
      .from("dietas")
      .select(SELECT_DIETA_COMPLETA)
      .eq("cliente_id", usuario.id)
      .eq("activa", true)
      .eq("tipo", tipo)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle();
  const haceSemana = new Date();
  haceSemana.setDate(haceSemana.getDate() - 7);
  const hoyMadrid = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const [
    { data: filaEntreno },
    { data: filaDescanso },
    { data: catalogo },
    { data: excluidos },
    { data: previos },
    { data: filaRutina },
    { data: sesiones },
    { data: medidas },
    { data: hechas },
  ] = await Promise.all([
      dietaDe("entreno"),
      dietaDe("descanso"),
      supabase
        .from("alimentos")
        .select("id, nombre, kcal_100, prot_100, carb_100, gras_100, fibra_100, categoria")
        .neq("nombre", "Añadir alimento")
        .order("nombre")
        .order("id"),
      supabase.from("alimentos_excluidos").select("alimentos ( nombre )").eq("cliente_id", usuario.id),
      supabase
        .from("asistente_mensajes")
        .select(CAMPOS)
        .eq("cliente_id", usuario.id)
        .gte("creado_en", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order("creado_en", { ascending: false })
        .limit(12),
      supabase
        .from("rutinas")
        .select(SELECT_RUTINA_COMPLETA)
        .eq("cliente_id", usuario.id)
        .eq("activa", true)
        .order("creada_en", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sesiones")
        .select("fecha_inicio, dia_id")
        .eq("cliente_id", usuario.id)
        .gte("fecha_inicio", haceSemana.toISOString())
        .order("fecha_inicio"),
      supabase
        .from("medidas")
        .select("peso, fecha")
        .eq("cliente_id", usuario.id)
        .not("peso", "is", null)
        .order("fecha", { ascending: false })
        .limit(5),
      supabase.from("comidas_hechas").select("comida").eq("cliente_id", usuario.id).eq("fecha", hoyMadrid),
    ]);
  const rutina = filaRutina ? aRutinaUI(filaRutina as unknown as FilaRutina) : null;
  const nombreDia = new Map((rutina?.dias ?? []).map((d) => [d.id, d.nombre]));

  const aPlan = (fila: unknown) => {
    const dieta = fila as Dieta | null;
    if (!dieta) return null;
    const comidas = ((dieta.dieta_comidas ?? []) as unknown as ComidaEstructurada[])
      .slice()
      .sort((a, b) => a.orden - b.orden);
    return { dieta, comidas };
  };
  const entreno = aPlan(filaEntreno);
  const descanso = aPlan(filaDescanso);

  const nombresPorId = new Map<string, string>();
  for (const c of [...(entreno?.comidas ?? []), ...(descanso?.comidas ?? [])]) {
    for (const i of c.dieta_comida_alimentos ?? []) if (i.alimentos) nombresPorId.set(i.alimento_id, i.alimentos.nombre);
  }
  let equivalencias: (Alternativa & { alimento: string })[] = [];
  if (nombresPorId.size > 0) {
    const { data: alt } = await supabase
      .from("alimento_alternativas")
      .select("alimento_id, nombre, gramos, orden")
      .in("alimento_id", [...nombresPorId.keys()])
      .order("orden");
    equivalencias = ((alt ?? []) as Alternativa[])
      .map((a) => ({ ...a, alimento: nombresPorId.get(a.alimento_id) ?? "" }))
      .sort((a, b) => a.alimento.localeCompare(b.alimento, "es") || a.orden - b.orden);
  }
  const nombresExcluidos = (excluidos ?? [])
    .map((e) => (e.alimentos as unknown as { nombre: string } | null)?.nombre)
    .filter((x): x is string => !!x);

  const contexto = textoCliente({
    nombre: String(perfil.nombre ?? ""),
    objetivo: perfil.objetivo as string | null,
    sexo: perfil.sexo as string | null,
    entreno,
    descanso,
    equivalencias,
    excluidos: nombresExcluidos,
    rutina,
  });
  const hoy = textoHoy({
    hoy: new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" }),
    hora: new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }),
    comidasHechas: (hechas ?? []).map((h) => String(h.comida)),
    entrenos: (sesiones ?? []).map((x) => ({
      fecha: new Date(x.fecha_inicio as string).toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        timeZone: "Europe/Madrid",
      }),
      dia: nombreDia.get(x.dia_id as string) ?? "entreno",
    })),
    pesos: (medidas ?? []).map((m) => ({ fecha: String(m.fecha), peso: Number(m.peso) })),
  });

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

  const anthropic = new Anthropic({ timeout: 80_000, maxRetries: 1 });
  let respuesta: { respuesta: string; alternativas: AlternativaAsistente[]; derivar: boolean };
  try {
    const r = await anthropic.beta.messages.create({
      model: MODELO,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      /* Con foto (una carta, una etiqueta) piensa más; para cambiar un
       * alimento o una duda normal, "medium" responde igual de bien y
       * gasta bastante menos. Fijo por tipo, para no romper la caché. */
      output_config: { effort: imagen ? "high" : "medium", format: { type: "json_schema", schema: FORMATO_RESPUESTA } },
      system: [
        /* Instrucciones y catálogo: iguales para todos, se cachean */
        { type: "text", text: INSTRUCCIONES },
        { type: "text", text: textoCatalogo((catalogo ?? []) as Alimento[]), cache_control: { type: "ephemeral" } },
        /* Lo de este cliente: igual durante toda su conversación */
        { type: "text", text: contexto, cache_control: { type: "ephemeral" } },
        /* Lo que cambia durante el día (hora, comidas hechas): sin caché */
        { type: "text", text: hoy },
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
    /* Consumo de cada pregunta en los registros de Vercel, para vigilar el gasto */
    console.log(
      `[asistente] entrada ${r.usage.input_tokens} · caché leída ${r.usage.cache_read_input_tokens ?? 0} · caché escrita ${r.usage.cache_creation_input_tokens ?? 0} · salida ${r.usage.output_tokens}${imagen ? " · con foto" : ""}`
    );
    if (r.stop_reason === "refusal") {
      respuesta = {
        respuesta: "Esa no te la puedo responder yo. Pregúntasela a Liviu, que te contesta él. 💪",
        alternativas: [],
        derivar: true,
      };
    } else {
      const bloque = r.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
      const datos = JSON.parse(bloque?.text ?? "{}") as Partial<typeof respuesta>;
      if (typeof datos.respuesta !== "string" || !datos.respuesta.trim()) throw new Error("Respuesta vacía");
      respuesta = {
        respuesta: datos.respuesta.trim(),
        alternativas: Array.isArray(datos.alternativas) ? datos.alternativas.slice(0, 4) : [],
        derivar: datos.derivar === true,
      };
    }
  } catch (e) {
    console.error("[asistente]", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return Response.json(
      { error: "El asistente no ha podido responder ahora. Prueba otra vez en un momento." },
      { status: 502 }
    );
  }

  /* Se guardan con la clave de servicio: el cliente no puede escribir respuestas */
  const ahora = Date.now();
  const { data: guardados, error } = await clienteServicio()
    .from("asistente_mensajes")
    .insert([
      { cliente_id: usuario.id, rol: "cliente", texto: pregunta, creado_en: new Date(ahora).toISOString() },
      {
        cliente_id: usuario.id,
        rol: "asistente",
        texto: respuesta.respuesta.slice(0, 4000),
        alternativas: respuesta.alternativas.length > 0 ? respuesta.alternativas : null,
        derivado: respuesta.derivar,
        creado_en: new Date(ahora + 1).toISOString(),
      },
    ])
    .select(CAMPOS);
  if (error) console.error("[asistente] guardar", error.message);

  const lista = ((guardados ?? []) as MensajeAsistente[]).sort((a, b) => a.creado_en.localeCompare(b.creado_en));
  return Response.json({
    pregunta: lista.find((m) => m.rol === "cliente") ?? null,
    respuesta:
      lista.find((m) => m.rol === "asistente") ??
      ({
        id: `local-${ahora}`,
        rol: "asistente",
        texto: respuesta.respuesta,
        alternativas: respuesta.alternativas,
        derivado: respuesta.derivar,
        creado_en: new Date(ahora + 1).toISOString(),
      } satisfies MensajeAsistente),
    restantes: Math.max(0, LIMITE_DIARIO - usadas - 1),
  });
}
