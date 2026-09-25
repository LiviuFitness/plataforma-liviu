import type { crearClienteNavegador } from "@/lib/supabase/cliente";

/**
 * Guardar una sesión de entreno, con o sin cobertura.
 *
 * En muchos gimnasios no hay señal justo al terminar. Si el guardado
 * falla por la red, la sesión entera se queda en una cola en el móvil y
 * se sube sola en cuanto vuelve la conexión (SubidaPendientes). Subir la
 * misma sesión dos veces es seguro: la base de datos no admite dos
 * sesiones del mismo cliente a la misma hora (error 23505), y en ese
 * caso solo se completan las series si faltaran.
 */

export interface SesionParaSubir {
  /** Clave de la cola: cliente + hora de inicio. */
  id: string;
  sesion: {
    cliente_id: string;
    dia_id: string;
    fecha_inicio: string;
    fecha_fin: string;
    prs_pre: number | null;
    sensacion: number | null;
    notas_cliente: string | null;
    expres?: boolean;
  };
  series: Record<string, unknown>[];
  /** Para el aviso: "Pierna A". */
  nombreDia: string;
}

export type ResultadoSubida = "ok" | "sin-red" | "error";

type Supabase = ReturnType<typeof crearClienteNavegador>;

const COLA = "sesiones-pendientes";

function esFalloDeRed(error: { message?: string; code?: string } | null): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const m = (error?.message ?? "").toLowerCase();
  return /failed to fetch|load failed|network|fetch/i.test(m) && !error?.code;
}

export async function subirSesion(supabase: Supabase, p: SesionParaSubir): Promise<ResultadoSubida> {
  const { data: sesion, error: e1 } = await supabase.from("sesiones").insert(p.sesion).select("id").single();

  let sesionId = sesion?.id as string | undefined;
  if (e1) {
    if (e1.code !== "23505") return esFalloDeRed(e1) ? "sin-red" : "error";
    /* Ya estaba: puede que de un intento anterior que se cortó antes de
     * las series. Si no tiene ninguna, se completan. */
    const { data: existente, error: e2 } = await supabase
      .from("sesiones")
      .select("id, series_realizadas ( id )")
      .eq("cliente_id", p.sesion.cliente_id)
      .eq("fecha_inicio", p.sesion.fecha_inicio)
      .maybeSingle();
    if (e2) return esFalloDeRed(e2) ? "sin-red" : "error";
    if (!existente || (existente.series_realizadas ?? []).length > 0) return "ok";
    sesionId = existente.id as string;
  }

  const { error: e3 } = await supabase
    .from("series_realizadas")
    .insert(p.series.map((s) => ({ ...s, sesion_id: sesionId })));
  if (e3) {
    const red = esFalloDeRed(e3);
    /* Sin series no vale: se deshace para que el reintento empiece limpio
     * (si tampoco hay red para borrarla, el reintento la completará) */
    await supabase.from("sesiones").delete().eq("id", sesionId!);
    return red ? "sin-red" : "error";
  }
  return "ok";
}

export function leerCola(): SesionParaSubir[] {
  try {
    return JSON.parse(localStorage.getItem(COLA) ?? "[]") as SesionParaSubir[];
  } catch {
    return [];
  }
}

function guardarCola(cola: SesionParaSubir[]) {
  try {
    localStorage.setItem(COLA, JSON.stringify(cola));
    window.dispatchEvent(new Event("sesiones-pendientes"));
  } catch {
    /* sin almacenamiento: no hay cola posible */
  }
}

export function encolar(p: SesionParaSubir) {
  guardarCola([...leerCola().filter((x) => x.id !== p.id), p]);
}

/** Intenta subir todo lo pendiente. Devuelve cuántas quedan. */
export async function subirPendientes(supabase: Supabase): Promise<number> {
  let cola = leerCola();
  for (const p of cola) {
    const r = await subirSesion(supabase, p);
    if (r === "sin-red") break; // sin red, ni lo intentes con las demás
    /* "error" que no es de red (dato raro): se deja en la cola para no
     * perder el entreno, pero no bloquea a las siguientes */
    if (r === "ok") cola = cola.filter((x) => x.id !== p.id);
  }
  guardarCola(cola);
  return cola.length;
}
