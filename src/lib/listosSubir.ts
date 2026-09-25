/**
 * "Listos para subir": ejercicios en los que un cliente ha llegado al
 * tope del rango de repeticiones, con el peso pautado y sin pasarse del
 * RIR, en sus dos últimas sesiones con ese ejercicio. Es la regla de la
 * doble progresión: cuando el rango se queda corto, toca subir peso.
 */

interface SeriePrescrita {
  tipo: string;
  kg: number | null;
  reps: number | null;
  reps_max: number | null;
  rir: number | null;
}

interface RutinaEjercicio {
  id: string;
  ejercicio_id: string;
  ejercicios: { nombre: string } | null;
  series_prescritas: SeriePrescrita[];
}

interface RutinaDia {
  semana: number;
  orden: number;
  rutina_ejercicios: RutinaEjercicio[];
}

export interface RutinaParaSubir {
  cliente_id: string;
  semana_actual: number;
  rutina_dias: RutinaDia[];
}

interface SerieRealizada {
  kg: number | null;
  reps: number | null;
  rir: number | null;
  completada: boolean;
  tipo: string;
  ejercicio_sustituto_id: string | null;
  rutina_ejercicios: { ejercicio_id: string } | null;
}

export interface SesionParaSubir {
  cliente_id: string;
  fecha_inicio: string;
  series_realizadas: SerieRealizada[];
}

export interface ListoParaSubir {
  clave: string;
  clienteId: string;
  nombre: string;
  ejercicio: string;
  kgActual: number;
  kgNuevo: number;
  detalle: string;
  /** Ese ejercicio en ese día, en la semana en curso y las siguientes:
   * a todos se les sube lo mismo. */
  rutinaEjercicioIds: string[];
}

const efectiva = (tipo: string) => tipo !== "calentamiento";

/** Lo que se sube: 2,5 kg (el disco más pequeño habitual a cada lado
 * de la barra o el salto de una polea); 1 kg en cargas muy ligeras. */
export function incremento(kg: number): number {
  return kg < 5 ? 1 : 2.5;
}

export function listosParaSubir(
  rutinas: RutinaParaSubir[],
  sesiones: SesionParaSubir[],
  nombres: Map<string, string>
): ListoParaSubir[] {
  const porCliente = new Map<string, SesionParaSubir[]>();
  for (const s of sesiones) {
    const lista = porCliente.get(s.cliente_id) ?? [];
    lista.push(s);
    porCliente.set(s.cliente_id, lista);
  }
  const resultado: ListoParaSubir[] = [];

  for (const rutina of rutinas) {
    const nombre = nombres.get(rutina.cliente_id);
    if (!nombre) continue;
    const suyas = (porCliente.get(rutina.cliente_id) ?? [])
      .slice()
      .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
    const vistos = new Set<string>();

    for (const dia of rutina.rutina_dias.filter((d) => d.semana === rutina.semana_actual)) {
      for (const re of dia.rutina_ejercicios ?? []) {
        if (vistos.has(re.ejercicio_id)) continue;
        const pautadas = (re.series_prescritas ?? []).filter(
          (s) => efectiva(s.tipo) && s.kg !== null && s.reps !== null
        );
        if (pautadas.length === 0) continue;
        const tope = Math.max(...pautadas.map((s) => s.reps_max ?? s.reps!));
        const kgPautado = Math.max(...pautadas.map((s) => Number(s.kg)));
        const rires = pautadas.map((s) => s.rir).filter((r): r is number => r !== null);
        const rirObjetivo = rires.length ? Math.min(...rires) : null;

        /* Sus dos últimas sesiones con este ejercicio */
        const ultimas: SerieRealizada[][] = [];
        for (const s of suyas) {
          const series = (s.series_realizadas ?? []).filter(
            (x) =>
              x.rutina_ejercicios?.ejercicio_id === re.ejercicio_id &&
              !x.ejercicio_sustituto_id &&
              x.completada &&
              efectiva(x.tipo)
          );
          if (series.length > 0) ultimas.push(series);
          if (ultimas.length === 2) break;
        }
        if (ultimas.length < 2) continue;

        const cumple = ultimas.every(
          (series) =>
            series.length >= pautadas.length &&
            series.every(
              (x) =>
                x.kg !== null &&
                Number(x.kg) >= kgPautado &&
                (x.reps ?? 0) >= tope &&
                (rirObjetivo === null || x.rir === null || x.rir >= rirObjetivo)
            )
        );
        if (!cumple) continue;
        vistos.add(re.ejercicio_id);

        const ids = rutina.rutina_dias
          .filter((d) => d.orden === dia.orden && d.semana >= rutina.semana_actual)
          .flatMap((d) => d.rutina_ejercicios ?? [])
          .filter((x) => x.ejercicio_id === re.ejercicio_id)
          .map((x) => x.id);

        resultado.push({
          clave: `${rutina.cliente_id}:${re.id}`,
          clienteId: rutina.cliente_id,
          nombre,
          ejercicio: re.ejercicios?.nombre ?? "Ejercicio",
          kgActual: kgPautado,
          kgNuevo: kgPautado + incremento(kgPautado),
          detalle: `${tope} reps${rirObjetivo !== null ? ` a RIR ${rirObjetivo}` : ""} · 2 sesiones seguidas`,
          rutinaEjercicioIds: ids,
        });
      }
    }
  }
  return resultado;
}
