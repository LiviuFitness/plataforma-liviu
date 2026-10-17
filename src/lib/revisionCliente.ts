/**
 * Fecha de la próxima revisión de cada cliente (su agenda de revisiones;
 * el cliente no la ve). Todo en días de calendario de Madrid.
 */

/** "AAAA-MM-DD" de hoy en Madrid a partir de un instante (ms) */
export const hoyMadrid = (ahoraMs: number) =>
  new Date(ahoraMs).toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });

const aUTC = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(a, m - 1, d);
};

/** Días desde hoy hasta la fecha (negativo si ya pasó) */
export const diasHasta = (fecha: string, hoy: string) => Math.round((aUTC(fecha) - aUTC(hoy)) / 86_400_000);

export function sumarSemanas(fecha: string, semanas: number): string {
  return new Date(aUTC(fecha) + semanas * 7 * 86_400_000).toISOString().slice(0, 10);
}

export type TonoRevision = "atrasada" | "hoy" | "pronto" | "lejos";

export function estadoRevision(fecha: string, hoy: string): { dias: number; tono: TonoRevision; corto: string } {
  const dias = diasHasta(fecha, hoy);
  if (dias < 0) return { dias, tono: "atrasada", corto: `hace ${-dias} ${dias === -1 ? "día" : "días"}` };
  if (dias === 0) return { dias, tono: "hoy", corto: "hoy" };
  if (dias === 1) return { dias, tono: "pronto", corto: "mañana" };
  return { dias, tono: dias <= 3 ? "pronto" : "lejos", corto: `en ${dias} días` };
}

/** "martes 20 oct" */
export const fechaRevision = (fecha: string) =>
  new Date(aUTC(fecha)).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "");

/** Clases de la etiqueta según lo cerca que está */
export const claseTono: Record<TonoRevision, string> = {
  atrasada: "bg-peligro/15 text-peligro",
  hoy: "bg-peligro/15 text-peligro",
  pronto: "bg-aviso/15 text-aviso",
  lejos: "bg-campo text-atenuado",
};
