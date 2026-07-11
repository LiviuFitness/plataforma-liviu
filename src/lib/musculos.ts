import { GRUPOS_MUSCULARES } from "./tipos";

export interface SerieConGrupo {
  fecha: string;
  grupo: string;
  completada: boolean;
  tipo: string;
}

export interface VolumenMuscular {
  grupo: string;
  seriesUltimos7Dias: number;
  diasDesdeUltimoEntreno: number | null; // null = nunca entrenado
}

/** Series efectivas y completadas por grupo muscular en los últimos 7
 * días, más cuántos días hace del último entreno de cada grupo — para
 * el mapa muscular de Mi Progreso y el aviso de "llevas X días sin
 * entrenar Y" en Inicio. */
export function calcularVolumenMuscular(series: SerieConGrupo[]): VolumenMuscular[] {
  const hace7dias = new Date();
  hace7dias.setDate(hace7dias.getDate() - 7);

  return GRUPOS_MUSCULARES.map((grupo) => {
    const delGrupo = series.filter(
      (s) => s.grupo === grupo && s.completada && s.tipo !== "calentamiento"
    );
    const seriesUltimos7Dias = delGrupo.filter(
      (s) => new Date(s.fecha) >= hace7dias
    ).length;
    const fechas = delGrupo.map((s) => new Date(s.fecha).getTime());
    const diasDesdeUltimoEntreno =
      fechas.length > 0
        ? Math.floor((Date.now() - Math.max(...fechas)) / 86400000)
        : null;
    return { grupo, seriesUltimos7Dias, diasDesdeUltimoEntreno };
  });
}

/** El grupo muscular más descuidado entre los que SÍ forman parte de la
 * rutina activa del cliente (no tiene sentido avisar de un grupo que su
 * plan ni siquiera trabaja). `null` si ninguno supera el umbral. */
export function grupoMasDescuidado(
  volumen: VolumenMuscular[],
  gruposEnRutina: Set<string>,
  umbralDias = 8
): VolumenMuscular | null {
  const candidatos = volumen
    .filter((v) => gruposEnRutina.has(v.grupo))
    .filter((v) => v.diasDesdeUltimoEntreno === null || v.diasDesdeUltimoEntreno >= umbralDias)
    .sort((a, b) => (b.diasDesdeUltimoEntreno ?? 9999) - (a.diasDesdeUltimoEntreno ?? 9999));
  return candidatos[0] ?? null;
}
