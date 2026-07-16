import { parsearReps, parsearRepsRealizadas, parsearRir } from "./rutinas";
import type { TipoSerie } from "./tipos";

export type EstadoEvaluacion = "cumplido" | "superado" | "no_alcanzado";

/** Solo "superado" y "no_alcanzado" se pintan en la interfaz — "cumplido"
 * es intencionalmente invisible, no hace falta destacar lo esperado. */
export const INFO_EVALUACION_SERIE: Record<
  EstadoEvaluacion,
  { etiqueta: string; color: string }
> = {
  cumplido: { etiqueta: "Objetivo cumplido", color: "var(--color-texto-2)" },
  superado: {
    etiqueta: "Has superado el objetivo — quizás puedas subir el peso la próxima vez",
    color: "var(--color-acento)",
  },
  no_alcanzado: {
    etiqueta: "Por debajo del objetivo previsto",
    color: "var(--color-aviso)",
  },
};

export interface UltimaSerieItem {
  texto: string;
  estado: EstadoEvaluacion | null;
}

interface DatosEvaluacion {
  repsPrescrito: { reps: number | null; reps_max: number | null };
  repsRealizado: { reps: number | null; reps_extra: number | null };
  rirPrescrito: number | null;
  rirRealizado: number | null;
}

/**
 * Compara lo prescrito vs. lo realizado de una serie ya completada.
 * Las reps mandan siempre (dato numérico fiable, siempre presente); el
 * RIR solo desempata cuando las reps ya caen dentro del rango, y solo si
 * tanto el objetivo como lo realizado son un número — si el objetivo es
 * una técnica de texto ("P+ISO HOLD") no hay nada numérico con lo que
 * comparar y el RIR simplemente no participa en el resultado.
 * Devuelve null cuando no hay datos suficientes para evaluar.
 */
export function evaluarSerie(d: DatosEvaluacion): EstadoEvaluacion | null {
  const minReps = d.repsPrescrito.reps;
  if (minReps === null) return null;
  const maxReps = d.repsPrescrito.reps_max ?? minReps;

  const repsBase = d.repsRealizado.reps;
  if (repsBase === null) return null;
  const totalRealizado = repsBase + (d.repsRealizado.reps_extra ?? 0);

  if (totalRealizado < minReps) return "no_alcanzado";
  if (totalRealizado > maxReps) return "superado";

  if (d.rirPrescrito !== null && d.rirRealizado !== null) {
    if (d.rirRealizado < d.rirPrescrito) return "superado"; // fue más allá del esfuerzo previsto
    if (d.rirRealizado > d.rirPrescrito) return "no_alcanzado"; // se quedó corto del esfuerzo previsto
  }
  return "cumplido";
}

/** Variante para una serie en curso (campos de texto libre del formulario
 * de `SesionEnCurso`). Los calentamientos no se evalúan — no son series
 * de trabajo, la variación ahí no dice nada. */
export function evaluarSerieSesion(serie: {
  tipo: TipoSerie;
  repsPrescrito: string;
  reps: string;
  rirPrescrito: string;
  rir: string;
  completada: boolean;
}): EstadoEvaluacion | null {
  if (!serie.completada || serie.tipo === "calentamiento") return null;
  return evaluarSerie({
    repsPrescrito: parsearReps(serie.repsPrescrito),
    repsRealizado: parsearRepsRealizadas(serie.reps),
    rirPrescrito: parsearRir(serie.rirPrescrito).rir,
    rirRealizado: parsearRir(serie.rir).rir,
  });
}
