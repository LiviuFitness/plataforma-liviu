import Anthropic from "@anthropic-ai/sdk";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { clienteServicio } from "@/lib/push";

/**
 * La IA de LivFit (Claude), en un solo sitio: el modelo, la llamada con
 * salida estructurada, la red de seguridad si el modelo se niega, y el
 * registro de lo que gasta cada llamada (se ve en los logs de Vercel).
 */

export const MODELO_IA = "claude-opus-5-5";

export const iaActiva = () => !!process.env.ANTHROPIC_API_KEY;

/* Precios de Claude Opus 5.5 en dólares por millón de tokens (entrada,
 * salida —incluye lo que piensa—, caché leída y caché escrita a 5 min) */
const PRECIO = { entrada: 4, salida: 20, cacheLeida: 0.2, cacheEscrita: 5 };

/** Apunta lo que ha gastado una llamada (para Estadísticas). Si falla, no pasa nada. */
async function apuntarGasto(etiqueta: string, u: { entrada: number; cacheLeida: number; cacheEscrita: number; salida: number }) {
  const coste =
    (u.entrada * PRECIO.entrada + u.salida * PRECIO.salida + u.cacheLeida * PRECIO.cacheLeida + u.cacheEscrita * PRECIO.cacheEscrita) /
    1_000_000;
  try {
    await clienteServicio().from("ia_uso").insert({
      etiqueta,
      modelo: MODELO_IA,
      entrada: u.entrada,
      cache_leida: u.cacheLeida,
      cache_escrita: u.cacheEscrita,
      salida: u.salida,
      coste_usd: Math.round(coste * 100000) / 100000,
    });
  } catch {
    /* sin la tabla (SQL sin pegar) o sin red: no se apunta */
  }
}

export type Esfuerzo = "low" | "medium" | "high";

export type ResultadoIA<T> = { ok: true; datos: T } | { ok: false; rechazo: boolean };

/** Una llamada que devuelve JSON con la forma de `schema` */
export async function pedirIA<T>(o: {
  /** Para los logs: "asistente", "revision"… */
  etiqueta: string;
  system: Anthropic.Beta.BetaTextBlockParam[];
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: Record<string, unknown>;
  effort: Esfuerzo;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<ResultadoIA<T>> {
  const anthropic = new Anthropic({ timeout: o.timeoutMs ?? 80_000, maxRetries: 1 });
  try {
    const r = await anthropic.beta.messages.create({
      model: MODELO_IA,
      max_tokens: o.maxTokens ?? 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: o.effort, format: { type: "json_schema", schema: o.schema } },
      system: o.system,
      messages: o.messages,
    });
    console.log(
      `[ia:${o.etiqueta}] entrada ${r.usage.input_tokens} · caché leída ${r.usage.cache_read_input_tokens ?? 0} · caché escrita ${r.usage.cache_creation_input_tokens ?? 0} · salida ${r.usage.output_tokens}`
    );
    await apuntarGasto(o.etiqueta, {
      entrada: r.usage.input_tokens,
      cacheLeida: r.usage.cache_read_input_tokens ?? 0,
      cacheEscrita: r.usage.cache_creation_input_tokens ?? 0,
      salida: r.usage.output_tokens,
    });
    if (r.stop_reason === "refusal") return { ok: false, rechazo: true };
    const bloque = r.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
    return { ok: true, datos: JSON.parse(bloque?.text ?? "") as T };
  } catch (e) {
    console.error(`[ia:${o.etiqueta}]`, e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return { ok: false, rechazo: false };
  }
}

/** Para las rutas del panel: solo el entrenador. Devuelve su cliente de
 * Supabase o la respuesta de error. */
export async function soloEntrenador() {
  const usuario = await obtenerUsuario();
  if (!usuario) return { error: Response.json({ error: "Sin sesión" }, { status: 401 }) } as const;
  const supabase = await crearClienteServidor();
  const { data: yo } = await supabase.from("profiles").select("rol").eq("id", usuario.id).maybeSingle();
  if (yo?.rol !== "entrenador") return { error: Response.json({ error: "Solo el entrenador" }, { status: 403 }) } as const;
  if (!iaActiva()) return { error: Response.json({ error: "La IA no está activada." }, { status: 503 }) } as const;
  return { supabase, usuario } as const;
}

export const ERROR_IA = "La IA no ha podido responder ahora. Prueba otra vez en un momento.";
