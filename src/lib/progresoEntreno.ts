import type { crearClienteServidor } from "./supabase/servidor";
import { calcularVolumenMuscular, type VolumenMuscular } from "./musculos";

export interface PR {
  ejercicio: string;
  kg: number;
  reps: number;
  fecha: string;
  /** 1RM estimado (fórmula de Epley) a partir de este mismo kg×reps. */
  unRM: number;
}

/** 1RM estimado con la fórmula de Epley. A partir de 1 rep el "estimado"
 * es el propio peso levantado (no hay nada que estimar). */
export function estimar1RM(kg: number, reps: number): number {
  if (!reps || reps <= 1) return kg;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}

export interface PuntoProgresion {
  fecha: string;
  kg: number;
}

export interface SesionHistorial {
  id: string;
  fecha: string;
  nombreDia: string;
  seriesHechas: number;
  sensacion: number | null;
  prsPre: number | null;
  /** Hecho en versión exprés (recortada). */
  expres: boolean;
  /** Para el calendario del entrenador: */
  fin?: string | null;
  /** Lo que escribió el cliente al terminar */
  nota?: string | null;
  /** Día opcional de su rutina (MMA, cardio…) */
  opcional?: boolean;
  /** Marcas nuevas de ese día: mejor que todo lo anterior en ese ejercicio */
  records?: { ejercicio: string; kg: number }[];
  /** Lo que hizo, ejercicio a ejercicio ("70×10 · 70×9") */
  ejercicios?: { nombre: string; series: string }[];
}

export interface ProgresoEntreno {
  prs: PR[];
  progresiones: Record<string, PuntoProgresion[]>;
  historial: SesionHistorial[];
  volumenMuscular: VolumenMuscular[];
}

interface FilaSerieRealizada {
  orden?: number;
  kg: number | null;
  reps: number | null;
  completada: boolean;
  tipo: string;
  /** Hecha con otro ejercicio ("máquina ocupada"): no es marca del pautado. */
  ejercicio_sustituto_id: string | null;
  rutina_ejercicios: {
    orden?: number;
    ejercicios: { nombre: string; grupo_muscular: string } | null;
  } | null;
}

interface FilaSesion {
  id: string;
  fecha_inicio: string;
  sensacion: number | null;
  prs_pre: number | null;
  expres: boolean | null;
  fecha_fin?: string | null;
  notas_cliente?: string | null;
  rutina_dias: { nombre: string; opcional?: boolean | null } | null;
  series_realizadas: FilaSerieRealizada[];
}

/** "70×10 · 70×9" por ejercicio, en el orden de la rutina (solo lo hecho) */
function resumenEjercicios(series: FilaSerieRealizada[]): { nombre: string; series: string }[] {
  const porEjercicio = new Map<string, { orden: number; partes: { orden: number; txt: string }[] }>();
  for (const x of series) {
    const nombre = x.rutina_ejercicios?.ejercicios?.nombre;
    if (!nombre || !x.completada || x.tipo === "calentamiento") continue;
    const kg = x.kg === null ? null : String(Number(x.kg)).replace(".", ",");
    const txt = kg && x.reps ? `${kg}×${x.reps}` : x.reps ? `${x.reps} reps` : "hecha";
    const g = porEjercicio.get(nombre) ?? { orden: x.rutina_ejercicios?.orden ?? 99, partes: [] };
    g.partes.push({ orden: x.orden ?? 0, txt });
    porEjercicio.set(nombre, g);
  }
  return [...porEjercicio.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([nombre, g]) => ({ nombre, series: g.partes.sort((a, b) => a.orden - b.orden).map((p) => p.txt).join(" · ") }));
}

/** Récords personales, progresión por ejercicio e historial de sesiones
 * de un cliente, a partir de sus últimas sesiones registradas. Lo usan
 * tanto la propia página "Mi progreso" del cliente como la ficha del
 * cliente en el panel del entrenador. */
export async function resolverProgresoEntreno(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  clienteId: string
): Promise<ProgresoEntreno> {
  const { data: sesiones } = await supabase
    .from("sesiones")
    .select(
      `id, fecha_inicio, fecha_fin, notas_cliente, sensacion, prs_pre, expres,
       rutina_dias ( nombre, opcional ),
       series_realizadas ( orden, kg, reps, completada, tipo, ejercicio_sustituto_id,
         rutina_ejercicios ( orden, ejercicios ( nombre, grupo_muscular ) ) )`
    )
    .eq("cliente_id", clienteId)
    .order("fecha_inicio", { ascending: false })
    .limit(60);

  const listaSesiones = (sesiones ?? []) as unknown as FilaSesion[];

  // Récords personales: mejor kg por ejercicio (series efectivas completadas)
  const mejores = new Map<string, PR>();
  for (const sesion of listaSesiones) {
    for (const serie of sesion.series_realizadas ?? []) {
      const nombre = serie.rutina_ejercicios?.ejercicios?.nombre;
      if (!nombre || !serie.completada || serie.tipo === "calentamiento") continue;
      if (serie.ejercicio_sustituto_id) continue;
      // Hace falta peso Y repeticiones: una serie marcada como hecha pero
      // sin repeticiones no dice si se levantó una vez o ninguna, y salía
      // en la lista como "340 kg × 0", sin 1RM estimado y por delante de
      // récords de verdad (se ordena por kg).
      if (serie.kg === null || !serie.reps || Number(serie.reps) < 1) continue;
      const actual = mejores.get(nombre);
      if (!actual || Number(serie.kg) > actual.kg) {
        mejores.set(nombre, {
          ejercicio: nombre,
          kg: Number(serie.kg),
          reps: serie.reps ?? 0,
          fecha: sesion.fecha_inicio,
          unRM: estimar1RM(Number(serie.kg), serie.reps ?? 0),
        });
      }
    }
  }
  const prs = [...mejores.values()].sort((a, b) => b.kg - a.kg).slice(0, 8);

  // Progresión por ejercicio: mejor kg de cada sesión, en orden cronológico
  const progresionesMap = new Map<string, PuntoProgresion[]>();
  const cronologico = listaSesiones
    .slice()
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  /* Récords de cada sesión: superar lo mejor de las sesiones anteriores */
  const mejorHastaAhora = new Map<string, number>();
  const recordsDe = new Map<string, { ejercicio: string; kg: number }[]>();
  for (const sesion of cronologico) {
    const mejorEnSesion = new Map<string, number>();
    for (const serie of sesion.series_realizadas ?? []) {
      const nombre = serie.rutina_ejercicios?.ejercicios?.nombre;
      // Mismo criterio que los récords de arriba, para que la gráfica de
      // progresión no dibuje picos de series sin repeticiones.
      if (
        !nombre ||
        serie.ejercicio_sustituto_id ||
        !serie.completada ||
        serie.tipo === "calentamiento" ||
        serie.kg === null ||
        !serie.reps ||
        Number(serie.reps) < 1
      )
        continue;
      const actual = mejorEnSesion.get(nombre) ?? 0;
      if (Number(serie.kg) > actual) mejorEnSesion.set(nombre, Number(serie.kg));
    }
    for (const [nombre, kg] of mejorEnSesion) {
      const antes = mejorHastaAhora.get(nombre);
      if (antes !== undefined && kg > antes) {
        recordsDe.set(sesion.id, [...(recordsDe.get(sesion.id) ?? []), { ejercicio: nombre, kg }]);
      }
      if (antes === undefined || kg > antes) mejorHastaAhora.set(nombre, kg);
      const lista = progresionesMap.get(nombre) ?? [];
      lista.push({ fecha: sesion.fecha_inicio, kg });
      progresionesMap.set(nombre, lista);
    }
  }
  const progresiones = Object.fromEntries(progresionesMap);

  const historial: SesionHistorial[] = listaSesiones.map((s) => ({
    id: s.id,
    fecha: s.fecha_inicio,
    nombreDia: s.rutina_dias?.nombre ?? "Entreno",
    seriesHechas: (s.series_realizadas ?? []).filter((x) => x.completada).length,
    sensacion: s.sensacion,
    prsPre: s.prs_pre,
    expres: !!s.expres,
    fin: s.fecha_fin ?? null,
    nota: s.notas_cliente?.trim() || null,
    opcional: !!s.rutina_dias?.opcional,
    records: recordsDe.get(s.id) ?? [],
    ejercicios: resumenEjercicios(s.series_realizadas ?? []),
  }));

  const volumenMuscular = calcularVolumenMuscular(
    listaSesiones.flatMap((s) =>
      (s.series_realizadas ?? []).flatMap((serie) => {
        const grupo = serie.rutina_ejercicios?.ejercicios?.grupo_muscular;
        return grupo
          ? [{ fecha: s.fecha_inicio, grupo, completada: serie.completada, tipo: serie.tipo }]
          : [];
      })
    )
  );

  return { prs, progresiones, historial, volumenMuscular };
}
