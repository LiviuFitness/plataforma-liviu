import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { calcularRevisionSemanal } from "@/lib/revision";
import MiProgreso, { type PR, type SesionHistorial } from "./MiProgreso";
import type { Medida } from "@/lib/tipos";

export const dynamic = "force-dynamic";

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

/** Progreso del cliente: peso propio, récords personales e historial. */
export default async function PaginaMiProgreso() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: medidas }, { data: sesiones }] = await Promise.all([
    supabase
      .from("medidas")
      .select("*")
      .eq("cliente_id", user.id)
      .order("fecha", { ascending: true }),
    supabase
      .from("sesiones")
      .select(
        `id, fecha_inicio, sensacion, prs_pre,
         rutina_dias ( nombre ),
         series_realizadas ( kg, reps, completada, tipo,
           rutina_ejercicios ( ejercicios ( nombre ) ) )`
      )
      .eq("cliente_id", user.id)
      .order("fecha_inicio", { ascending: false })
      .limit(60),
  ]);

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
  const progresionesMap = new Map<string, { fecha: string; kg: number }[]>();
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

  const semanas = calcularRevisionSemanal(
    (medidas ?? []).map((m) => ({ fecha: m.fecha, peso: m.peso }))
  );
  const semanaActual = semanas[semanas.length - 1] ?? null;

  return (
    <MiProgreso
      clienteId={user.id}
      medidas={(medidas ?? []) as Medida[]}
      prs={prs}
      historial={historial}
      semanaActual={semanaActual}
      progresiones={progresiones}
    />
  );
}
