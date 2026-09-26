import { cargarContextoCliente, haceCuanto, textoChat, textoEstiloLiviu } from "@/lib/contextoIA";
import { ERROR_IA, pedirIA, soloEntrenador } from "@/lib/ia";
import { calcularRevisionSemanal, lunesDe } from "@/lib/revision";
import type { RevisionIA } from "@/lib/iaTipos";

export const dynamic = "force-dynamic";
export const maxDuration = 90;


/** Lo que la ronda ya tiene calculado de ese cliente (lo manda el panel) */
interface DatosRonda {
  pesoMedio: number | null;
  variacionPct: number | null;
  ritmo: number;
  entrenos: number;
  objetivoEntrenos: number;
  sensacion: number | null;
  cuestionario: { pregunta: string; respuesta: string }[];
  kcal: number | null;
  dietaPct: number | null;
  sugerencia: { texto: string; deltaKcal: number } | null;
}

const FORMATO = {
  type: "object",
  properties: {
    resumen: { type: "string", description: "Para Liviu: cómo ha ido la semana, de 2 a 4 frases, con datos concretos." },
    delta_kcal: { type: "integer", enum: [-150, -100, 0, 100, 150], description: "Ajuste de kcal diarias propuesto." },
    propuesta: { type: "string", description: "Para Liviu: qué cambiaría y por qué, en 1 o 2 frases." },
    mensaje: { type: "string", description: "Para el cliente, con la voz de Liviu." },
  },
  required: ["resumen", "delta_kcal", "propuesta", "mensaje"],
  additionalProperties: false,
} as const;

const INSTRUCCIONES = `Eres el ayudante de Liviu, entrenador personal y dueño de LivFit. Cada lunes Liviu revisa a sus clientes uno a uno, y tú le preparas cada revisión para que la decida en un minuto: un resumen de la semana, una propuesta y el mensaje para el cliente.

El resumen (para Liviu, que conoce al cliente): de 2 a 4 frases, directas, con los datos que importan: cómo va el peso respecto a su objetivo, cuánto ha entrenado frente a lo pautado, cómo cumple la dieta, qué ha contestado en su cuestionario y qué le ha preguntado al asistente o por el chat si dice algo de cómo está. Di qué va bien y dónde está el problema de verdad. Nada de relleno ni de repetir datos sin interpretarlos.

La propuesta y el ajuste de kcal:
- Si el peso va al ritmo de su objetivo, no toques las kcal (0).
- Si el problema es que no cumple (dieta sin marcar, se salta comidas, pocos entrenos), lo normal es no tocar las kcal: la propuesta es sobre la adherencia (hablarlo con él, simplificar una comida, cambiar un horario…).
- Solo propón subir o bajar kcal cuando lleva al menos una semana fuera de ritmo cumpliendo razonablemente. Ten en cuenta los ajustes recientes: si ya se le bajó hace poco, dale tiempo.
- La app calcula una sugerencia automática por el ritmo de peso: tenla en cuenta, pero decide tú con todo el contexto.
- Si la propuesta implica cambiar alimentos o repartos, dilo en concreto (qué comida y cómo): Liviu lo hará a mano en el editor.

El mensaje para el cliente: con la voz de Liviu (tutea, cercano, motivador, directo, algún emoji sin pasarse), de 2 a 4 frases. Empieza por algo concreto que haya hecho bien esta semana. Si hay ajuste, cuéntale el cambio de forma sencilla (sin cifras de kcal) y por qué. Si el problema es de adherencia, anímale sin reñir y proponle una cosa concreta. Nada de diagnósticos de salud. Escribe su nombre de pila, no el completo.`;

export async function POST(request: Request) {
  const acceso = await soloEntrenador();
  if ("error" in acceso) return acceso.error;
  const { supabase } = acceso;

  const cuerpo = (await request.json().catch(() => ({}))) as {
    clienteId?: string;
    rehacer?: boolean;
    datos?: DatosRonda;
  };
  if (!cuerpo.clienteId || !cuerpo.datos) return Response.json({ error: "Faltan datos" }, { status: 400 });
  const clienteId = cuerpo.clienteId;
  const semana = lunesDe(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" }));

  /* Ya hecha esta semana: se reutiliza (no se paga dos veces) */
  if (!cuerpo.rehacer) {
    const { data: guardada } = await supabase
      .from("ia_borradores")
      .select("datos")
      .eq("cliente_id", clienteId)
      .eq("tipo", "revision")
      .eq("clave", semana)
      .maybeSingle();
    if (guardada) return Response.json(guardada.datos as RevisionIA);
  }

  const hace6semanas = new Date();
  hace6semanas.setDate(hace6semanas.getDate() - 42);
  const hace7dias = new Date(Date.now() - 7 * 86400000).toISOString();
  const [ctx, chat, estilo, { data: medidas }, { data: ajustes }, { data: preguntas }] = await Promise.all([
    cargarContextoCliente(supabase, clienteId, { diasEntrenos: 14 }),
    textoChat(supabase, clienteId, 12),
    textoEstiloLiviu(supabase),
    supabase
      .from("medidas")
      .select("fecha, peso")
      .eq("cliente_id", clienteId)
      .gte("fecha", hace6semanas.toLocaleDateString("sv-SE"))
      .order("fecha"),
    supabase
      .from("revisiones_kcal")
      .select("delta, kcal_nuevo, creado_en")
      .eq("cliente_id", clienteId)
      .order("creado_en", { ascending: false })
      .limit(4),
    supabase
      .from("asistente_mensajes")
      .select("rol, texto, derivado, creado_en")
      .eq("cliente_id", clienteId)
      .gte("creado_en", hace7dias)
      .order("creado_en"),
  ]);
  if (!ctx) return Response.json({ error: "Cliente no encontrado" }, { status: 404 });

  const d = cuerpo.datos;
  const coma = (n: number, dec = 1) => n.toFixed(dec).replace(".", ",");
  const semanas = calcularRevisionSemanal(
    (medidas ?? []).map((m) => ({ fecha: String(m.fecha), peso: m.peso === null ? null : Number(m.peso) }))
  );
  const ahora = new Date();
  const lineas = [
    `SEMANA DE REVISIÓN (lunes ${semana})`,
    `Peso: ${
      semanas.length
        ? semanas
            .map((s) => `semana del ${s.inicioSemana}: media ${coma(s.mediaPeso)} kg${s.variacionPct === null ? "" : ` (${s.variacionPct > 0 ? "+" : ""}${coma(s.variacionPct, 2)} %)`}`)
            .join("; ")
        : "no se ha pesado en las últimas 6 semanas"
    }.`,
    `Ritmo objetivo: ${d.ritmo > 0 ? "+" : ""}${coma(d.ritmo, 2)} % de peso por semana.`,
    `Entrenos la semana pasada: ${d.entrenos}${d.objetivoEntrenos > 0 ? ` de ${d.objetivoEntrenos} pautados` : " (sin rutina)"}.${
      d.sensacion !== null ? ` Sensación media en los entrenos: ${coma(d.sensacion)} de 5.` : ""
    }`,
    d.kcal !== null ? `Kcal diarias actuales: ${d.kcal}.` : "No tiene dieta asignada.",
    d.dietaPct !== null ? `Comidas marcadas como hechas en los últimos 7 días: ${d.dietaPct} %.` : "No usa el check de comidas.",
    (ajustes ?? []).length
      ? `Ajustes de kcal recientes: ${(ajustes ?? [])
          .map((a) => `${Number(a.delta) > 0 ? "+" : ""}${a.delta} kcal (${haceCuanto(a.creado_en as string, ahora)})`)
          .join(", ")}.`
      : "No se le han ajustado las kcal recientemente.",
    d.sugerencia ? `Sugerencia automática de la app: ${d.sugerencia.texto}` : "La app no sugiere ajuste por el ritmo de peso.",
    d.cuestionario.length
      ? `SU CUESTIONARIO SEMANAL\n${d.cuestionario.map((q) => `- ${q.pregunta}: ${q.respuesta}`).join("\n")}`
      : "No ha contestado el cuestionario semanal.",
    (preguntas ?? []).length
      ? `LO QUE HA PREGUNTADO AL ASISTENTE DE DIETA ESTA SEMANA\n${(preguntas ?? [])
          .filter((p) => p.rol === "cliente")
          .map((p) => `- ${String(p.texto).slice(0, 200)}`)
          .join("\n")}`
      : "No ha usado el asistente de dieta esta semana.",
    chat,
  ];

  const r = await pedirIA<RevisionIA>({
    etiqueta: "revision",
    effort: "medium",
    schema: FORMATO,
    system: [
      { type: "text", text: INSTRUCCIONES },
      ...(estilo ? [{ type: "text" as const, text: estilo }] : []),
      { type: "text", text: `${ctx.estable}\n\n${ctx.hoy}` },
    ],
    messages: [{ role: "user", content: lineas.join("\n\n") }],
  });
  if (!r.ok) return Response.json({ error: ERROR_IA }, { status: 502 });
  const datos: RevisionIA = {
    resumen: String(r.datos.resumen ?? "").trim(),
    delta_kcal: [-150, -100, 0, 100, 150].includes(r.datos.delta_kcal) ? r.datos.delta_kcal : 0,
    propuesta: String(r.datos.propuesta ?? "").trim(),
    mensaje: String(r.datos.mensaje ?? "").trim(),
  };
  await supabase
    .from("ia_borradores")
    .upsert({ cliente_id: clienteId, tipo: "revision", clave: semana, datos, creado_en: new Date().toISOString() });
  return Response.json(datos);
}
