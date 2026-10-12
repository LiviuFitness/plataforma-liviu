import { cargarContextoCliente } from "@/lib/contextoIA";
import { ERROR_IA, pedirIA, soloEntrenador } from "@/lib/ia";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";
import type { BorradorRutinaIA, SerieRutinaIA } from "@/lib/iaTipos";
import type { RutinaUI } from "@/lib/tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Crear rutina con IA: con la biblioteca de ejercicios de Liviu (numerada,
 * para que solo elija ejercicios que existen), su forma de pautar (una
 * rutina suya como ejemplo) y lo que Liviu pida. Devuelve un borrador; la
 * rutina solo se crea si Liviu le da a «Usar».
 */

interface EjercicioIA {
  n: number;
  series: SerieRutinaIA[];
}

const SERIE = {
  type: "object",
  properties: {
    reps: { type: "integer", description: "Repeticiones (el mínimo si es un rango)" },
    reps_max: { type: "integer", description: "Máximo del rango (8-10 → 10), o 0 si es un número fijo" },
    rir: { anyOf: [{ type: "integer" }, { type: "null" }], description: "RIR pautado; null si la serie lleva técnica" },
    tecnica: { type: "string", description: 'Técnica de intensidad ("P"…) o "" si no lleva' },
  },
  required: ["reps", "reps_max", "rir", "tecnica"],
  additionalProperties: false,
} as const;

const FORMATO = {
  type: "object",
  properties: {
    dias: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string", description: 'En mayúsculas, como los de Liviu: "TORSO A", "PIERNA B"…' },
          ejercicios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                n: { type: "integer", description: "Número del ejercicio en la biblioteca" },
                series: { type: "array", items: SERIE },
              },
              required: ["n", "series"],
              additionalProperties: false,
            },
          },
        },
        required: ["nombre", "ejercicios"],
        additionalProperties: false,
      },
    },
    explicacion: { type: "string", description: "Para Liviu: en 1 o 2 frases, cómo la has planteado y por qué." },
  },
  required: ["dias", "explicacion"],
  additionalProperties: false,
} as const;

const INSTRUCCIONES = `Eres el ayudante de Liviu, entrenador personal de LivFit. Le preparas el borrador de la rutina de un cliente (una semana tipo que se repite en todo el mesociclo), que él revisará y retocará en su editor. Tiene que parecer hecha por él.

Reglas:
- Usa SOLO ejercicios de la biblioteca, por su número. Nunca los que el cliente evita.
- Respeta el número de días, la división, el material disponible y lo que Liviu cuente (molestias, preferencias). Si una molestia desaconseja un ejercicio, no lo pongas.
- Pauta como Liviu: copia su estilo del ejemplo (número de series por ejercicio, rangos de repeticiones, RIR y técnicas como "P" en la última serie). Si no hay ejemplo: 2-3 series por ejercicio, una primera de 5-8 y el resto de 8-10 a RIR 0-1; 8-12 en aislamientos pequeños.
- Entre 5 y 7 ejercicios por día. Empieza por los multiarticulares o los del músculo prioritario.
- Volumen semanal por músculo: unas 10-12 series efectivas en los grandes, 15-18 en los prioritarios y 0-4 en los que Liviu pide poco. No repitas el mismo ejercicio dos veces el mismo día.
- Si es una división con días A y B, que no sean idénticos: cambia ángulos y máquinas.`;

/** "5-8 RIR 0 · 8-10 P", para enseñarle a la IA cómo pauta Liviu */
function textoRutina(r: RutinaUI): string {
  const dias = r.dias.filter((d) => d.semana === r.semana_actual && !d.opcional);
  return dias
    .map(
      (d) =>
        `${d.nombre}\n` +
        d.ejercicios
          .map(
            (e) =>
              `- ${e.nombre}: ` +
              e.series
                .filter((s) => s.tipo !== "calentamiento")
                .map((s) => `${s.reps || "?"}${/^\d+$/.test(s.rir) ? ` RIR ${s.rir}` : s.rir ? ` ${s.rir}` : ""}`)
                .join(" · ")
          )
          .join("\n")
    )
    .join("\n");
}

export async function POST(request: Request) {
  const acceso = await soloEntrenador();
  if ("error" in acceso) return acceso.error;
  const { supabase } = acceso;

  const c = (await request.json().catch(() => ({}))) as {
    clienteId?: string;
    dias?: number;
    division?: string;
    mas?: string[];
    menos?: string[];
    material?: string[];
    semanas?: number;
    notas?: string;
  };
  if (!c.clienteId) return Response.json({ error: "Faltan datos" }, { status: 400 });
  const nDias = Math.min(6, Math.max(2, Math.round(c.dias ?? 4)));
  const semanas = Math.min(16, Math.max(4, Math.round(c.semanas ?? 12)));
  const lista = (x: unknown) => (Array.isArray(x) ? x.map(String).map((s) => s.slice(0, 40)).slice(0, 12) : []);

  const [ctx, { data: biblioteca }, { data: excluidos }, { data: ejemplo }] = await Promise.all([
    cargarContextoCliente(supabase, c.clienteId),
    supabase.from("ejercicios").select("id, nombre, grupo_muscular, material").order("grupo_muscular").order("nombre"),
    supabase.from("ejercicios_excluidos").select("ejercicio_id").eq("cliente_id", c.clienteId),
    /* Su forma de pautar: la rutina de cliente más reciente que haya hecho */
    supabase
      .from("rutinas")
      .select(SELECT_RUTINA_COMPLETA)
      .eq("es_plantilla", false)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!ctx) return Response.json({ error: "Cliente no encontrado" }, { status: 404 });

  const fuera = new Set((excluidos ?? []).map((e) => String(e.ejercicio_id)));
  const ejercicios = (biblioteca ?? []).filter((e) => !fuera.has(String(e.id)));
  const catalogo = ejercicios
    .map((e, k) => `${k + 1}. ${e.nombre} [${e.grupo_muscular}]${e.material ? ` (${e.material})` : ""}`)
    .join("\n");
  const ejemploRutina = ejemplo ? textoRutina(aRutinaUI(ejemplo as unknown as FilaRutina)) : "";

  const peticion = [
    `RUTINA QUE HAY QUE CREAR: ${nDias} días por semana${c.division ? `, división ${c.division}` : ""}.`,
    lista(c.mas).length ? `Músculos a priorizar: ${lista(c.mas).join(", ")}.` : "",
    lista(c.menos).length ? `Músculos con poco volumen: ${lista(c.menos).join(", ")}.` : "",
    lista(c.material).length ? `Material disponible: ${lista(c.material).join(", ")}.` : "",
    c.notas?.trim() ? `LO QUE CUENTA LIVIU DEL CLIENTE: ${c.notas.trim().slice(0, 1500)}` : "",
    ctx.rutina ? `Su rutina actual, para no repetirla tal cual y saber qué hace ya:\n${textoRutina(ctx.rutina)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const r = await pedirIA<{ dias: { nombre: string; ejercicios: EjercicioIA[] }[]; explicacion: string }>({
    etiqueta: "rutina",
    effort: "medium",
    maxTokens: 16000,
    timeoutMs: 110_000,
    schema: FORMATO,
    system: [
      { type: "text", text: INSTRUCCIONES },
      { type: "text", text: `BIBLIOTECA (número. nombre [músculo] (material))\n${catalogo}` },
      ...(ejemploRutina ? [{ type: "text" as const, text: `ASÍ PAUTA LIVIU (una rutina suya, como ejemplo de estilo)\n\n${ejemploRutina}` }] : []),
      { type: "text", text: ctx.estable },
    ],
    messages: [{ role: "user", content: peticion }],
  });
  if (!r.ok || !Array.isArray(r.datos.dias) || r.datos.dias.length === 0) {
    return Response.json({ error: ERROR_IA }, { status: 502 });
  }

  const limpia = (s: SerieRutinaIA): SerieRutinaIA => ({
    reps: Math.min(50, Math.max(1, Math.round(Number(s.reps) || 8))),
    reps_max: Math.min(50, Math.max(0, Math.round(Number(s.reps_max) || 0))),
    rir: s.rir === null || s.rir === undefined ? null : Math.min(5, Math.max(0, Math.round(Number(s.rir)))),
    tecnica: String(s.tecnica ?? "").trim().slice(0, 20),
  });
  const dias = r.datos.dias.slice(0, nDias).map((d, k) => ({
    nombre: String(d.nombre || `DÍA ${k + 1}`).slice(0, 40),
    ejercicios: (d.ejercicios ?? [])
      .map((e) => ({ e: ejercicios[e.n - 1], series: (e.series ?? []).slice(0, 6).map(limpia) }))
      .filter((x) => x.e && x.series.length > 0)
      .map((x) => ({ ejercicioId: String(x.e.id), nombre: String(x.e.nombre), grupo: String(x.e.grupo_muscular), series: x.series })),
  }));

  const volumen = new Map<string, number>();
  for (const d of dias) for (const e of d.ejercicios) volumen.set(e.grupo, (volumen.get(e.grupo) ?? 0) + e.series.length);

  const borrador: BorradorRutinaIA = {
    dias,
    semanas,
    volumen: [...volumen.entries()].sort((a, b) => b[1] - a[1]),
    explicacion: String(r.datos.explicacion ?? "").trim(),
  };
  return Response.json(borrador);
}
