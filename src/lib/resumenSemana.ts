/**
 * Resumen de la semana pasada (lunes a domingo) para la tarjeta que ve
 * el cliente en Inicio los lunes y martes: cuánto entrenó, cuánto
 * levantó comparado con la semana anterior, sus récords y su peso.
 */

interface SerieResumen {
  kg: number | null;
  reps: number | null;
  reps_extra: number | null;
  completada: boolean;
  tipo: string;
  rutina_ejercicios: { ejercicios: { nombre: string } | null } | null;
}

export interface SesionResumen {
  fecha_inicio: string;
  series_realizadas: SerieResumen[];
}

export interface ResumenSemana {
  /** "del 14 al 20 de septiembre" */
  rango: string;
  entrenos: number;
  objetivo: number;
  volumenKg: number;
  /** % frente a la semana anterior; null si no hay con qué comparar. */
  volumenPct: number | null;
  records: number;
  pesoMedio: number | null;
  /** kg frente a la media de la semana anterior. */
  pesoDelta: number | null;
}

function lunesDe(d: Date): Date {
  const l = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  l.setDate(l.getDate() - ((l.getDay() + 6) % 7));
  return l;
}

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function resumenSemanaPasada(
  sesiones: SesionResumen[],
  medidas: { fecha: string; peso: number | string | null }[],
  objetivo: number,
  hoy: Date
): ResumenSemana | null {
  const lunesEsta = lunesDe(hoy);
  const lunesPasada = new Date(lunesEsta);
  lunesPasada.setDate(lunesPasada.getDate() - 7);
  const lunesAnterior = new Date(lunesPasada);
  lunesAnterior.setDate(lunesAnterior.getDate() - 7);
  const domingo = new Date(lunesEsta);
  domingo.setDate(domingo.getDate() - 1);

  const enRango = (t: Date, desde: Date, hasta: Date) => t >= desde && t < hasta;

  let volumenPasada = 0;
  let volumenAnterior = 0;
  const diasPasada = new Set<string>();
  for (const s of sesiones) {
    const t = new Date(s.fecha_inicio);
    const pasada = enRango(t, lunesPasada, lunesEsta);
    const anterior = enRango(t, lunesAnterior, lunesPasada);
    if (!pasada && !anterior) continue;
    if (pasada) diasPasada.add(t.toLocaleDateString("sv-SE"));
    const vol = (s.series_realizadas ?? []).reduce((a, x) => {
      if (!x.completada || x.kg === null) return a;
      return a + Number(x.kg) * ((x.reps ?? 0) + (x.reps_extra ?? 0));
    }, 0);
    if (pasada) volumenPasada += vol;
    else volumenAnterior += vol;
  }

  /* Récords: cada vez que un ejercicio supera su mejor marca anterior
   * dentro de la semana pasada. Sin historial previo no cuenta (la
   * primera vez que se hace un ejercicio no es un récord). */
  const mejores = new Map<string, number>();
  let records = 0;
  const cronologico = sesiones.slice().sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  for (const s of cronologico) {
    const t = new Date(s.fecha_inicio);
    if (t >= lunesEsta) break;
    const pasada = t >= lunesPasada;
    const maxSesion = new Map<string, number>();
    for (const x of s.series_realizadas ?? []) {
      const nombre = x.rutina_ejercicios?.ejercicios?.nombre;
      if (!nombre || !x.completada || x.tipo === "calentamiento" || x.kg === null) continue;
      maxSesion.set(nombre, Math.max(maxSesion.get(nombre) ?? 0, Number(x.kg)));
    }
    for (const [nombre, kg] of maxSesion) {
      const antes = mejores.get(nombre);
      if (pasada && antes !== undefined && kg > antes) records++;
      if (antes === undefined || kg > antes) mejores.set(nombre, kg);
    }
  }

  const pesos = (desde: Date, hasta: Date) =>
    medidas
      .filter((m) => m.peso !== null)
      .filter((m) => {
        const [a, mes, d] = m.fecha.slice(0, 10).split("-").map(Number);
        return enRango(new Date(a, mes - 1, d), desde, hasta);
      })
      .map((m) => Number(m.peso));
  const pesoMedio = media(pesos(lunesPasada, lunesEsta));
  const pesoAntes = media(pesos(lunesAnterior, lunesPasada));

  /* Una semana sin nada que contar no merece tarjeta */
  if (diasPasada.size === 0 && pesoMedio === null) return null;

  const mesFin = domingo.toLocaleDateString("es-ES", { month: "long" });
  const mesIni = lunesPasada.toLocaleDateString("es-ES", { month: "long" });
  const rango =
    mesIni === mesFin
      ? `del ${lunesPasada.getDate()} al ${domingo.getDate()} de ${mesFin}`
      : `del ${lunesPasada.getDate()} de ${mesIni} al ${domingo.getDate()} de ${mesFin}`;

  return {
    rango,
    entrenos: diasPasada.size,
    objetivo,
    volumenKg: volumenPasada,
    volumenPct:
      volumenAnterior > 0 && volumenPasada > 0
        ? Math.round(((volumenPasada - volumenAnterior) / volumenAnterior) * 100)
        : null,
    records,
    pesoMedio,
    pesoDelta: pesoMedio !== null && pesoAntes !== null ? pesoMedio - pesoAntes : null,
  };
}
