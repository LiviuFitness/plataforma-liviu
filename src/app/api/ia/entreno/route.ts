import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio, enviarAvisos } from "@/lib/push";
import { guardarConversacion, limiteAgotado, preguntasDeHoy, LIMITE_DIARIO } from "@/lib/asistenteServidor";
import { ERROR_IA, iaActiva, pedirIA } from "@/lib/ia";
import type { RespuestaCoachIA } from "@/lib/iaTipos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * "Pregúntame" dentro del entreno: cuánto peso poner, qué hacer si algo
 * molesta, cómo se hace. Sabe lo pautado, lo que lleva hecho hoy y las
 * últimas veces que hizo ese ejercicio. Cuenta en las preguntas del día
 * y se guarda con las del asistente (Liviu las ve en la ficha). Si hay
 * molestias, se lo avisa a Liviu al momento.
 */

interface DatosEjercicio {
  nombre: string;
  grupo?: string;
  pautadas: { tipo: string; kg: string; reps: string; rir: string }[];
  hechasHoy: { kg: string; reps: string; rir: string }[];
  historial: { cuando: string; series: string }[];
  tecnica?: string | null;
  notas?: string | null;
  notaPropia?: string | null;
  alternativas: string[];
}

const FORMATO = {
  type: "object",
  properties: {
    respuesta: { type: "string" },
    alternativa: {
      type: "string",
      description: 'Si le propones cambiar de ejercicio, el nombre EXACTO de una de sus alternativas; si no, "".',
    },
    derivar: { type: "boolean", description: "true si hay dolor o molestias: Liviu debe saberlo." },
  },
  required: ["respuesta", "alternativa", "derivar"],
  additionalProperties: false,
} as const;

const INSTRUCCIONES = `Eres el coach del Asistente LivFit, dentro del entreno de un cliente de Liviu (entrenador personal). El cliente está en el gimnasio, entre series, con el móvil en la mano: responde en 1 a 3 frases, en español de España, tuteando, cercano y claro. Texto plano, sin markdown.

- Peso de hoy: básate en lo pautado por Liviu (kg, repeticiones y RIR, que es cuántas repeticiones dejar en recámara) y en lo que hizo las últimas veces. Si la última vez completó las repeticiones con margen, sube lo mínimo razonable (en mancuernas, el siguiente par; en barra o máquina, 2,5 a 5 kg); si le costó o no llegó, mantén. Da un número concreto y cuándo volver atrás.
- Técnica: explica lo esencial del ejercicio en pocas claves, y si Liviu ha escrito criterios de técnica o notas, respétalos por encima de todo.
- Dolor o molestias: nunca le digas que siga con dolor. Que pare ese ejercicio, propón una de sus alternativas si alguna evita la molestia (pon su nombre exacto en "alternativa") o que lo deje por hoy, y marca "derivar" para que Liviu lo sepa. Sin diagnósticos.
- No cambies su rutina más allá de hoy: si pide cambios permanentes, que lo hable con Liviu ("derivar").
- Si pregunta algo que no tiene que ver con el entreno, dile con simpatía que ahí solo le ayudas con el ejercicio.`;

export async function POST(request: Request) {
  const usuario = await obtenerUsuario();
  if (!usuario) return Response.json({ error: "Sin sesión" }, { status: 401 });
  if (!iaActiva()) return Response.json({ error: "El asistente todavía no está activado." }, { status: 503 });

  const cuerpo = (await request.json().catch(() => ({}))) as { pregunta?: unknown; ejercicio?: DatosEjercicio };
  const pregunta = typeof cuerpo.pregunta === "string" ? cuerpo.pregunta.trim().slice(0, 500) : "";
  const e = cuerpo.ejercicio;
  if (!pregunta || !e?.nombre) return Response.json({ error: "Escribe tu pregunta." }, { status: 400 });

  const supabase = await crearClienteServidor();
  const { data: perfil } = await supabase
    .from("profiles")
    .select("rol, nombre, sexo, objetivo")
    .eq("id", usuario.id)
    .maybeSingle();
  if (perfil?.rol !== "cliente") return Response.json({ error: "Solo para clientes." }, { status: 403 });

  const usadas = await preguntasDeHoy(usuario.id);
  if (usadas >= LIMITE_DIARIO) return limiteAgotado();

  const lista = (l: string[]) => l.filter(Boolean).join("\n");
  const datos = lista([
    `CLIENTE: ${String(perfil.nombre ?? "").split(" ")[0]}${perfil.sexo ? ` · ${perfil.sexo}` : ""}${perfil.objetivo ? ` · objetivo: ${perfil.objetivo}` : ""}`,
    `EJERCICIO: ${String(e.nombre).slice(0, 80)}${e.grupo ? ` (${String(e.grupo).slice(0, 40)})` : ""}`,
    `PAUTADO POR LIVIU HOY: ${(e.pautadas ?? [])
      .slice(0, 12)
      .map((s, k) => `serie ${k + 1}${s.tipo && s.tipo !== "efectiva" ? ` (${s.tipo})` : ""}: ${s.kg || "?"} kg × ${s.reps || "?"}${s.rir ? ` RIR ${s.rir}` : ""}`)
      .join("; ")}`,
    (e.hechasHoy ?? []).length
      ? `LO QUE LLEVA HECHO HOY: ${(e.hechasHoy ?? [])
          .slice(0, 12)
          .map((s, k) => `serie ${k + 1}: ${s.kg || "?"} kg × ${s.reps || "?"}${s.rir ? ` RIR ${s.rir}` : ""}`)
          .join("; ")}`
      : "Hoy todavía no ha hecho ninguna serie de este ejercicio.",
    (e.historial ?? []).length
      ? `LAS ÚLTIMAS VECES:\n${(e.historial ?? []).slice(0, 5).map((h) => `- ${String(h.cuando).slice(0, 30)}: ${String(h.series).slice(0, 200)}`).join("\n")}`
      : "Es la primera vez que hace este ejercicio.",
    e.tecnica ? `CRITERIOS DE TÉCNICA DE LIVIU: ${String(e.tecnica).slice(0, 600)}` : "",
    e.notas ? `NOTAS DE LIVIU: ${String(e.notas).slice(0, 400)}` : "",
    e.notaPropia ? `SU NOTA PROPIA: ${String(e.notaPropia).slice(0, 200)}` : "",
    `SUS ALTERNATIVAS PARA HOY (pautadas por Liviu): ${(e.alternativas ?? []).length ? (e.alternativas ?? []).slice(0, 10).join(", ") : "ninguna"}`,
  ]);

  const r = await pedirIA<RespuestaCoachIA>({
    etiqueta: "entreno",
    effort: "medium",
    schema: FORMATO,
    system: [{ type: "text", text: INSTRUCCIONES }],
    messages: [{ role: "user", content: `${datos}\n\nSU PREGUNTA: ${pregunta}` }],
  });

  let respuesta: RespuestaCoachIA;
  if (!r.ok && r.rechazo) {
    respuesta = { respuesta: "Esa mejor pregúntasela a Liviu. 💪", alternativa: null, derivar: true };
  } else if (!r.ok || !String(r.datos.respuesta ?? "").trim()) {
    return Response.json({ error: ERROR_IA }, { status: 502 });
  } else {
    const alt = String(r.datos.alternativa ?? "").trim();
    respuesta = {
      respuesta: String(r.datos.respuesta).trim(),
      alternativa: alt && (e.alternativas ?? []).includes(alt) ? alt : null,
      derivar: r.datos.derivar === true,
    };
  }

  /* Se guarda con lo del asistente, para que Liviu lo vea en la ficha */
  await guardarConversacion(usuario.id, `🏋️ ${e.nombre}: ${pregunta}`, {
    respuesta: respuesta.respuesta,
    alternativas: respuesta.alternativa ? [{ nombre: respuesta.alternativa, cantidad: "hoy" }] : [],
    derivar: respuesta.derivar,
  });

  /* Molestias: Liviu se entera al momento */
  if (respuesta.derivar) {
    const { data: entrenadores } = await clienteServicio().from("profiles").select("id").eq("rol", "entrenador");
    const pila = String(perfil.nombre ?? "Un cliente").split(" ")[0];
    await enviarAvisos(
      (entrenadores ?? []).map((x) => x.id as string),
      "mensajes",
      () => ({
        titulo: `${pila} · ${e.nombre}`,
        cuerpo: `Ha preguntado en el entreno: "${pregunta.slice(0, 110)}"`,
        url: `/clientes/${usuario.id}`,
      })
    ).catch(() => 0);
  }

  return Response.json({ ...respuesta, restantes: Math.max(0, LIMITE_DIARIO - usadas - 1) });
}
