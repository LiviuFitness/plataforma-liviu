import type { UltimaSerieItem } from "@/lib/evaluacionSerie";

/** Una de las últimas veces que se hizo un ejercicio, para la sesión. */
export interface VezEjercicio {
  /** "mar 22 sep" */
  fecha: string;
  /** "hoy" · "ayer" · "hace 4 días" · "hace 3 semanas" */
  cuando: string;
  items: UltimaSerieItem[];
  /** Mejor kg de ese día (series efectivas), para la gráfica */
  mejorKg: number | null;
}

const madrid = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

/** Se calcula en el servidor para que el texto no cambie al hidratar. */
export function cuandoFue(fechaISO: string, ahora = new Date()): string {
  const [a1, m1, d1] = madrid(new Date(fechaISO)).split("-").map(Number);
  const [a2, m2, d2] = madrid(ahora).split("-").map(Number);
  const dias = Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 14) return `hace ${dias} días`;
  if (dias < 60) return `hace ${Math.round(dias / 7)} semanas`;
  return `hace ${Math.round(dias / 30)} meses`;
}

export function fechaCortaSesion(fechaISO: string): string {
  return new Date(fechaISO)
    .toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Madrid" })
    .replace(/\./g, "");
}
