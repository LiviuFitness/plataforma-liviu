import { agruparPorSuperserie } from "@/lib/rutinas";

/**
 * Entreno exprés: la versión corta de un día para cuando no hay tiempo,
 * en vez de saltárselo.
 *
 *  · Se quedan los ejercicios del principio (los importantes: el
 *    entrenador pone primero los básicos) hasta dos tercios del día,
 *    mínimo 3. Una superserie entra o sale entera.
 *  · Calentamientos solo en el primer ejercicio: después, el cuerpo ya
 *    viene caliente.
 *  · Del tercer ejercicio en adelante (accesorios), una serie efectiva
 *    menos si tenían 3 o más.
 */

interface SerieMin {
  tipo: string;
}
interface EjercicioMin<S extends SerieMin> {
  nombre: string;
  grupoSuperserie: string | null;
  series: S[];
}

export interface CambioExpres {
  nombre: string;
  /** Series efectivas (no calentamiento) antes y después. */
  antes: number;
  despues: number;
  fuera: boolean;
}

const efectivas = (series: SerieMin[]) => series.filter((s) => s.tipo !== "calentamiento").length;

/** Solo merece la pena ofrecerlo en días con algo que recortar. */
export function admiteExpres(ejercicios: EjercicioMin<SerieMin>[]): boolean {
  return ejercicios.length >= 4;
}

export function versionExpres<S extends SerieMin, E extends EjercicioMin<S>>(
  ejercicios: E[]
): { ejercicios: E[]; cambios: CambioExpres[] } {
  const objetivo = Math.max(3, Math.ceil((ejercicios.length * 2) / 3));
  const quedan: E[] = [];
  for (const grupo of agruparPorSuperserie(ejercicios)) {
    if (quedan.length >= objetivo) break;
    quedan.push(...grupo);
  }

  const recortados = quedan.map((e, i) => {
    let series = i === 0 ? e.series : e.series.filter((s) => s.tipo !== "calentamiento");
    if (i >= 2 && efectivas(series) >= 3) {
      /* Fuera la última efectiva (la última serie que no es calentamiento) */
      const ultima = series.map((s) => s.tipo !== "calentamiento").lastIndexOf(true);
      series = series.filter((_, j) => j !== ultima);
    }
    return { ...e, series };
  });

  const cambios: CambioExpres[] = ejercicios.map((e, i) => ({
    nombre: e.nombre,
    antes: efectivas(e.series),
    despues: i < recortados.length ? efectivas(recortados[i].series) : 0,
    fuera: i >= recortados.length,
  }));

  return { ejercicios: recortados, cambios };
}

/** Minutos orientativos, con la misma cuenta que Inicio (2,5–3,2 min
 * por serie efectiva, cambio de ejercicio incluido). */
export function duracionEstimada(seriesEfectivas: number): string {
  return `${Math.round(seriesEfectivas * 2.5)}–${Math.round(seriesEfectivas * 3.2)} min`;
}
