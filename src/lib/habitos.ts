import type { Habito, HabitoRegistro } from "./tipos";

/** Fecha local en formato AAAA-MM-DD (evita desfases de zona horaria). */
export function fechaLocal(d: Date = new Date()): string {
  return d.toLocaleDateString("sv-SE");
}

/** Lunes (00:00 local) de la semana que contiene `fecha`. */
export function inicioSemana(fecha: Date = new Date()): Date {
  const d = new Date(fecha);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Para un hábito, las 7 casillas (L-D) de la semana en curso: true si está registrado como completado. */
export function casillasSemana(
  registros: HabitoRegistro[],
  habitoId: string
): boolean[] {
  const lunes = inicioSemana();
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return fechaLocal(d);
  });
  const marcados = new Set(
    registros
      .filter((r) => r.habito_id === habitoId && r.completado)
      .map((r) => r.fecha)
  );
  return dias.map((f) => marcados.has(f));
}

/** % de casillas completadas en las últimas `semanas` (7×semanas días), sobre los hábitos activos. */
export function consistencia(
  habitos: Habito[],
  registros: HabitoRegistro[],
  semanas = 1
): number {
  const activos = habitos.filter((h) => h.activo);
  if (activos.length === 0) return 0;
  const desde = new Date();
  desde.setDate(desde.getDate() - 7 * semanas);
  const total = activos.length * 7 * semanas;
  const hechos = registros.filter(
    (r) =>
      r.completado &&
      activos.some((h) => h.id === r.habito_id) &&
      new Date(r.fecha) >= desde
  ).length;
  return Math.round((100 * hechos) / total);
}
