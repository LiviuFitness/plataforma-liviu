import type { crearClienteServidor } from "./supabase/servidor";

export interface PR {
  ejercicio: string;
  kg: number;
  reps: number;
  fecha: string;
}

export interface PuntoProgresion {
  fecha: string;
  kg: number;
}

export interface SesionHistorial {
  id: string;
  fecha: string;
  nombreDia: string;
  seriesHechas: number;
  sensacion: number | null;
  prsPre: number | null;
}

export interface ProgresoEntreno {
  prs: PR[];
  progresiones: Record<string, PuntoProgresion[]>;
  historial: SesionHistorial[];
}

interface FilaSerieRealizada {
  kg: number | null;
  reps: number | null;
  completada: boolean;
  tipo: string;
  rutina_ejercicios: { ejercicios: { nombre: string } | null } | null;
}

interface FilaSesion {
  id: string;
  fecha_inicio: string;
  sensacion: number | null;
  prs_pre: number | null;
  rutina_dias: { nombre: string } | null;
  series_realizadas: FilaSerieRealizada[];
}

/** Récords personales, progresión por ejercicio e historial de sesiones
 * de un cliente, a partir de sus últimas sesiones registradas. Lo usan
 * tanto la propia página "Mi progreso" del cliente como la ficha del
 * cliente en el panel del entrenador. */
export async function resolverProgresoEntreno(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  clienteId: string
): Promise<ProgresoEntreno> {
  const { data: sesiones } = await supabase
    .from("sesiones")
    .select(
      `id, fecha_inicio, sensacion, prs_pre,
       rutina_dias ( nombre ),
       series_realizadas ( kg, reps, completada, tipo,
         rutina_ejercicios ( ejercicios ( nombre ) ) )`
    )
    .eq("cliente_id", clienteId)
    .order("fecha_inicio", { ascending: false })
    .limit(60);

  const listaSesiones = (sesiones ?? []) as unknown as FilaSesion[];

  // Récords personales: mejor kg por ejercicio (series efectivas completadas)
  const mejores = new Map<string, PR>();
  for (const sesion of listaSesiones) {
    for (const serie of sesion.series_realizadas ?? []) {
      const nombre = serie.rutina_ejercicios?.ejercicios?.nombre;
      if (!nombre || !serie.completada || serie.tipo === "calentamiento") continue;
      if (serie.kg === null) continue;
      const actual = mejores.get(nombre);
      if (!actual || Number(serie.kg) > actual.kg) {
        mejores.set(nombre, {
          ejercicio: nombre,
          kg: Number(serie.kg),
          reps: serie.reps ?? 0,
          fecha: sesion.fecha_inicio,
        });
      }
    }
  }
  const prs = [...mejores.values()].sort((a, b) => b.kg - a.kg).slice(0, 8);

  // Progresión por ejercicio: mejor kg de cada sesión, en orden cronológico
  const progresionesMap = new Map<string, PuntoProgresion[]>();
  const cronologico = listaSesiones
    .slice()
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
  for (const sesion of cronologico) {
    const mejorEnSesion = new Map<string, number>();
    for (const serie of sesion.series_realizadas ?? []) {
      const nombre = serie.rutina_ejercicios?.ejercicios?.nombre;
      if (!nombre || !serie.completada || serie.tipo === "calentamiento" || serie.kg === null)
        continue;
      const actual = mejorEnSesion.get(nombre) ?? 0;
      if (Number(serie.kg) > actual) mejorEnSesion.set(nombre, Number(serie.kg));
    }
    for (const [nombre, kg] of mejorEnSesion) {
      const lista = progresionesMap.get(nombre) ?? [];
      lista.push({ fecha: sesion.fecha_inicio, kg });
      progresionesMap.set(nombre, lista);
    }
  }
  const progresiones = Object.fromEntries(progresionesMap);

  const historial: SesionHistorial[] = listaSesiones.map((s) => ({
    id: s.id,
    fecha: s.fecha_inicio,
    nombreDia: s.rutina_dias?.nombre ?? "Entreno",
    seriesHechas: (s.series_realizadas ?? []).filter((x) => x.completada).length,
    sensacion: s.sensacion,
    prsPre: s.prs_pre,
  }));

  return { prs, progresiones, historial };
}
