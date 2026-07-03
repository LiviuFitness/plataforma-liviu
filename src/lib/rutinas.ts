import type { DiaUI, RutinaUI, SerieUI, TipoSerie } from "./tipos";

/* Forma de la fila anidada que devuelve Supabase al pedir una rutina completa */
export const SELECT_RUTINA_COMPLETA = `
  id, nombre, notas,
  rutina_dias (
    id, orden, nombre,
    rutina_ejercicios (
      id, orden, descanso_seg, notas, ejercicio_id,
      ejercicios ( nombre, grupo_muscular ),
      series_prescritas ( id, orden, tipo, kg, reps, rir )
    )
  )
`;

interface FilaSerie {
  orden: number;
  tipo: TipoSerie;
  kg: number | null;
  reps: number | null;
  rir: number | null;
}

interface FilaRutinaEjercicio {
  orden: number;
  descanso_seg: number;
  notas: string | null;
  ejercicio_id: string;
  ejercicios: { nombre: string; grupo_muscular: string } | null;
  series_prescritas: FilaSerie[];
}

interface FilaDia {
  id: string;
  orden: number;
  nombre: string;
  rutina_ejercicios: FilaRutinaEjercicio[];
}

export interface FilaRutina {
  id: string;
  nombre: string;
  notas: string | null;
  rutina_dias: FilaDia[];
}

/** Convierte la fila anidada de Supabase en la estructura del editor. */
export function aRutinaUI(fila: FilaRutina): RutinaUI {
  const dias: DiaUI[] = (fila.rutina_dias ?? [])
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((d) => ({
      id: d.id,
      orden: d.orden,
      nombre: d.nombre,
      ejercicios: (d.rutina_ejercicios ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((e) => ({
          ejercicio_id: e.ejercicio_id,
          nombre: e.ejercicios?.nombre ?? "Ejercicio",
          grupo_muscular: e.ejercicios?.grupo_muscular ?? "",
          descanso_seg: e.descanso_seg,
          notas: e.notas ?? "",
          series: (e.series_prescritas ?? [])
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map(
              (s): SerieUI => ({
                tipo: s.tipo,
                kg: s.kg === null ? "" : String(s.kg),
                reps: s.reps === null ? "" : String(s.reps),
                rir: s.rir === null ? "" : String(s.rir),
              })
            ),
        })),
    }));

  return { id: fila.id, nombre: fila.nombre, notas: fila.notas, dias };
}

/** Convierte el texto de un campo numérico del editor ("72,5") a número o null. */
export function aNumero(texto: string): number | null {
  const limpio = String(texto).trim().replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}
