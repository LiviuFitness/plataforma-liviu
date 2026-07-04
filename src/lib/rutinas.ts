import type { DiaUI, RutinaUI, SerieUI, TipoSerie } from "./tipos";

/* Forma de la fila anidada que devuelve Supabase al pedir una rutina completa */
export const SELECT_RUTINA_COMPLETA = `
  id, nombre, notas, semana_actual,
  rutina_dias (
    id, orden, nombre, semana,
    rutina_ejercicios (
      id, orden, descanso_seg, notas, ejercicio_id,
      ejercicios ( nombre, grupo_muscular ),
      series_prescritas ( id, orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto )
    )
  )
`;

interface FilaSerie {
  orden: number;
  tipo: TipoSerie;
  kg: number | null;
  reps: number | null;
  rir: number | null;
  reps_max: number | null;
  tecnica: string | null;
  carga_texto: string | null;
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
  semana: number;
  rutina_ejercicios: FilaRutinaEjercicio[];
}

export interface FilaRutina {
  id: string;
  nombre: string;
  notas: string | null;
  semana_actual: number;
  rutina_dias: FilaDia[];
}

/* ============================================================
   Campos flexibles (como en el Excel de Liviu):
   · Reps admite "8" o "6-10" (rango)
   · Carga admite "90", "90 goma azul" o "goma azul"
   · RIR admite "2" o una técnica: "P", "P+ISO HOLD", "myo"…
   Se escriben como texto y se descomponen al guardar.
   ============================================================ */

/** "6-10" → {reps: 6, reps_max: 10} · "8" → {reps: 8, reps_max: null} */
export function parsearReps(texto: string): { reps: number | null; reps_max: number | null } {
  const limpio = texto.trim();
  const rango = limpio.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (rango) return { reps: Number(rango[1]), reps_max: Number(rango[2]) };
  const unico = limpio.match(/^\d+$/);
  return { reps: unico ? Number(limpio) : null, reps_max: null };
}

export function componerReps(reps: number | null, reps_max: number | null): string {
  if (reps === null) return "";
  return reps_max === null ? String(reps) : `${reps}-${reps_max}`;
}

/** "90 goma azul" → {kg: 90, carga_texto: "goma azul"} · "goma azul" → {kg: null, ...} */
export function parsearCarga(texto: string): { kg: number | null; carga_texto: string | null } {
  const limpio = texto.trim().replace(",", ".");
  if (limpio === "") return { kg: null, carga_texto: null };
  const con = limpio.match(/^(\d+(?:\.\d+)?)\s*(?:\(([^)]*)\)|(.*))?$/);
  if (con && con[1]) {
    const resto = (con[2] ?? con[3] ?? "").trim();
    return { kg: Number(con[1]), carga_texto: resto || null };
  }
  return { kg: null, carga_texto: limpio };
}

export function componerCarga(kg: number | null, carga_texto: string | null): string {
  if (kg !== null && carga_texto) return `${kg} ${carga_texto}`;
  if (kg !== null) return String(kg);
  return carga_texto ?? "";
}

/** "2" → {rir: 2} · "P+ISO HOLD" → {tecnica: "P+ISO HOLD"} */
export function parsearRir(texto: string): { rir: number | null; tecnica: string | null } {
  const limpio = texto.trim();
  if (limpio === "" || limpio === "—" || limpio === "-") return { rir: null, tecnica: null };
  if (/^\d+$/.test(limpio)) return { rir: Number(limpio), tecnica: null };
  return { rir: null, tecnica: limpio };
}

export function componerRir(rir: number | null, tecnica: string | null): string {
  if (rir !== null) return String(rir);
  return tecnica ?? "";
}

/** Reps realizadas: "8+3" o "8 (+3)" → reps 8 con 3 extra de rest-pause */
export function parsearRepsRealizadas(texto: string): { reps: number | null; reps_extra: number | null } {
  const limpio = texto.trim();
  const restPause = limpio.match(/^(\d+)\s*\(?\+\s*(\d+)\)?$/);
  if (restPause) return { reps: Number(restPause[1]), reps_extra: Number(restPause[2]) };
  const unico = limpio.match(/^\d+$/);
  return { reps: unico ? Number(limpio) : null, reps_extra: null };
}

/** Convierte la fila anidada de Supabase en la estructura del editor. */
export function aRutinaUI(fila: FilaRutina): RutinaUI {
  const dias: DiaUI[] = (fila.rutina_dias ?? [])
    .slice()
    .sort((a, b) => a.semana - b.semana || a.orden - b.orden)
    .map((d) => ({
      id: d.id,
      orden: d.orden,
      nombre: d.nombre,
      semana: d.semana ?? 1,
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
                kg: componerCarga(s.kg === null ? null : Number(s.kg), s.carga_texto),
                reps: componerReps(s.reps, s.reps_max),
                rir: componerRir(s.rir, s.tecnica),
              })
            ),
        })),
    }));

  return {
    id: fila.id,
    nombre: fila.nombre,
    notas: fila.notas,
    semana_actual: fila.semana_actual ?? 1,
    dias,
  };
}

/** Convierte el texto de un campo numérico del editor ("72,5") a número o null. */
export function aNumero(texto: string): number | null {
  const limpio = String(texto).trim().replace(",", ".");
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}
