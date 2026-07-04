/* ============================================================
   Revisión semanal (como el REGISTRO SEMANAL del Excel de Liviu):
   media de peso por semana (lunes-domingo), variación frente a la
   semana anterior y, si se aleja del ritmo objetivo, una sugerencia
   de ajuste de kcal.
   ============================================================ */

export interface SemanaRevision {
  inicioSemana: string; // ISO (lunes de esa semana)
  mediaPeso: number;
  numRegistros: number;
  variacionKg: number | null; // vs. semana anterior
  variacionPct: number | null;
}

function lunesDe(fechaISO: string): string {
  const d = new Date(fechaISO + "T00:00:00");
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return lunes.toISOString().slice(0, 10);
}

/** Agrupa las medidas de peso por semana (lunes-domingo) y calcula variaciones. */
export function calcularRevisionSemanal(
  medidas: { fecha: string; peso: number | null }[]
): SemanaRevision[] {
  const porSemana = new Map<string, number[]>();
  for (const m of medidas) {
    if (m.peso === null) continue;
    const clave = lunesDe(m.fecha);
    const arr = porSemana.get(clave) ?? [];
    arr.push(Number(m.peso));
    porSemana.set(clave, arr);
  }

  const semanas = [...porSemana.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([inicioSemana, pesos]) => ({
      inicioSemana,
      mediaPeso: pesos.reduce((a, b) => a + b, 0) / pesos.length,
      numRegistros: pesos.length,
    }));

  return semanas.map((actual, i) => {
    const anterior = i > 0 ? semanas[i - 1] : null;
    const variacionKg = anterior ? actual.mediaPeso - anterior.mediaPeso : null;
    const variacionPct =
      anterior && anterior.mediaPeso
        ? (variacionKg! / anterior.mediaPeso) * 100
        : null;
    return { ...actual, variacionKg, variacionPct };
  });
}

/** Ritmo por defecto según el objetivo del cliente, si no se ha fijado uno explícito. */
export function ritmoPorDefecto(objetivo: string | null): number {
  const o = (objetivo ?? "").toLowerCase();
  if (o.includes("pérdida")) return -0.25;
  if (o.includes("ganancia")) return 0.25;
  return 0;
}

export interface Sugerencia {
  texto: string;
  deltaKcal: number;
}

/** Compara el ritmo real de la última semana con el objetivo y sugiere un ajuste. */
export function sugerenciaAjusteKcal(
  variacionPctUltima: number | null,
  objetivoPct: number
): Sugerencia | null {
  if (variacionPctUltima === null) return null;
  const diff = variacionPctUltima - objetivoPct;
  const umbral = 0.12;
  if (Math.abs(diff) < umbral) return null;

  // diff > 0: el peso baja menos (o sube más) de lo previsto → bajar kcal.
  // diff < 0: el peso baja más (o sube menos) de lo previsto → subir kcal.
  const deltaKcal = diff > 0 ? -150 : 150;
  const verbo = deltaKcal < 0 ? "bajar" : "subir";
  return {
    texto: `El ritmo real de esta semana (${variacionPctUltima.toFixed(2)}%) se aleja del objetivo (${objetivoPct.toFixed(2)}%/semana). Prueba a ${verbo} unas ${Math.abs(deltaKcal)} kcal/día y revisa otra vez la próxima semana.`,
    deltaKcal,
  };
}
