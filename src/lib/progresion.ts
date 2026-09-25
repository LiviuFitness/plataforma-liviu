import {
  componerCarga,
  componerReps,
  componerRir,
  parsearCarga,
  parsearReps,
  parsearRir,
} from "@/lib/rutinas";
import type { SerieUI, TipoSerie } from "@/lib/tipos";

/**
 * Progresión al duplicar una semana del mesociclo.
 *
 * Antes duplicar copiaba la semana tal cual y había que reescribir cada
 * serie a mano para bajar el RIR o subir la carga. Aquí se elige una
 * regla y se aplica a todas las series efectivas de la semana nueva.
 *
 * Solo se tocan las series EFECTIVAS: el calentamiento, los dropsets y
 * las de fallo tienen su propia lógica. Y dentro de ellas, solo lo que
 * la regla puede entender sin adivinar: una serie con técnica ("P",
 * "Myo") no tiene RIR que bajar, y una carga con texto ("goma azul",
 * "90 con cadenas") no se sabe si 2,5 kg más es más o menos ayuda.
 */

export type ModoProgresion = "igual" | "rir" | "kg" | "reps";

export const MODOS_PROGRESION: { clave: ModoProgresion; titulo: string; detalle: string }[] = [
  { clave: "igual", titulo: "Igual", detalle: "Copia tal cual, como hasta ahora." },
  {
    clave: "rir",
    titulo: "−1 RIR",
    detalle: "Cada serie efectiva, un RIR menos (nunca por debajo de 0).",
  },
  { clave: "kg", titulo: "+2,5 kg", detalle: "Suma 2,5 kg a las series efectivas con peso." },
  { clave: "reps", titulo: "+1 repetición", detalle: "Sube el rango: 8-10 pasa a 9-11." },
];

/** Una serie prescrita tal como está en la base de datos. */
export interface SerieBD {
  tipo: TipoSerie;
  kg: number | null;
  reps: number | null;
  reps_max: number | null;
  rir: number | null;
  tecnica: string | null;
  carga_texto: string | null;
}

/** Lo que cambia en una serie con esta regla, o null si no cambia nada. */
export function progresar(
  s: SerieBD,
  modo: ModoProgresion
): Partial<Pick<SerieBD, "kg" | "reps" | "reps_max" | "rir">> | null {
  if (modo === "igual" || s.tipo !== "efectiva") return null;
  if (modo === "rir") {
    if (s.rir === null || s.tecnica || s.rir <= 0) return null;
    return { rir: s.rir - 1 };
  }
  if (modo === "kg") {
    if (s.kg === null || s.carga_texto) return null;
    return { kg: Math.round((Number(s.kg) + 2.5) * 100) / 100 };
  }
  if (s.reps === null) return null;
  return { reps: s.reps + 1, reps_max: s.reps_max === null ? null : s.reps_max + 1 };
}

/** La misma regla sobre una serie del editor (textos), para la vista
 * previa: se traduce a los campos de la base de datos, se progresa y se
 * vuelve a texto con las mismas funciones que usa el editor al guardar. */
export function progresarSerieUI(serie: SerieUI, modo: ModoProgresion): SerieUI | null {
  const carga = parsearCarga(serie.kg);
  const reps = parsearReps(serie.reps);
  const rir = parsearRir(serie.rir);
  const bd: SerieBD = { tipo: serie.tipo, ...carga, ...reps, ...rir };
  const cambio = progresar(bd, modo);
  if (!cambio) return null;
  const nueva = { ...bd, ...cambio };
  return {
    tipo: serie.tipo,
    kg: componerCarga(nueva.kg, nueva.carga_texto),
    reps: componerReps(nueva.reps, nueva.reps_max),
    rir: componerRir(nueva.rir, nueva.tecnica),
  };
}

/** "80 kg · 8-10 · RIR 2" — cómo se lee una serie en la vista previa. */
export function describirSerie(s: SerieUI): string {
  const partes: string[] = [];
  if (s.kg) partes.push(/^\d/.test(s.kg) && !/[a-z]/i.test(s.kg) ? `${s.kg.replace(".", ",")} kg` : s.kg);
  if (s.reps) partes.push(s.reps);
  if (s.rir) partes.push(/^\d+$/.test(s.rir) ? `RIR ${s.rir}` : s.rir);
  return partes.join(" · ") || "sin pautar";
}
