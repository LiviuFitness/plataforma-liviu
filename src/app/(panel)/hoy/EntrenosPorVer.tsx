import { crearClienteServidor } from "@/lib/supabase/servidor";
import { evaluarSerie } from "@/lib/evaluacionSerie";
import { cuandoFue } from "@/lib/historialEjercicio";
import TarjetasPorVer, { type EntrenoPorVer } from "./TarjetasPorVer";

interface FilaSerie {
  orden: number;
  tipo: string;
  kg: number | null;
  reps: number | null;
  reps_extra: number | null;
  rir: number | null;
  completada: boolean;
  rutina_ejercicios: {
    series_prescritas: { orden: number; tipo: string; reps: number | null; reps_max: number | null; rir: number | null }[];
  } | null;
}

interface FilaSesion {
  id: string;
  cliente_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  prs_pre: number | null;
  sensacion: number | null;
  notas_cliente: string | null;
  rutina_dias: { nombre: string } | null;
  series_realizadas: FilaSerie[];
}

/**
 * «Entrenos por ver» (Hoy › Para hoy): los entrenos de los últimos 3 días
 * que aún no has visto, con lo que importa para reaccionar sin abrirlos.
 * Si falta la columna vista_en (SQL sin pegar), la consulta falla y el
 * bloque simplemente no sale.
 */
export default async function EntrenosPorVer({
  nombres,
  fotos,
  records,
}: {
  nombres: Map<string, string>;
  fotos: Map<string, string | null>;
  /** Récords de la semana por cliente (el mejor) */
  records: Map<string, { ejercicio: string; kg: number }>;
}) {
  const supabase = await crearClienteServidor();
  const ahora = new Date();
  const desde = new Date(ahora);
  desde.setDate(desde.getDate() - 3);
  const { data, error } = await supabase
    .from("sesiones")
    .select(
      `id, cliente_id, fecha_inicio, fecha_fin, prs_pre, sensacion, notas_cliente,
       rutina_dias ( nombre ),
       series_realizadas ( orden, tipo, kg, reps, reps_extra, rir, completada,
         rutina_ejercicios ( series_prescritas ( orden, tipo, reps, reps_max, rir ) ) )`
    )
    .is("vista_en", null)
    .not("fecha_fin", "is", null)
    .gte("fecha_inicio", desde.toISOString())
    .order("fecha_inicio", { ascending: false })
    .limit(20);
  if (error || !data || data.length === 0) return null;

  const entrenos: EntrenoPorVer[] = (data as unknown as FilaSesion[])
    .filter((s) => nombres.has(s.cliente_id))
    .map((s) => {
      let volumen = 0;
      let cortas = 0;
      for (const sr of s.series_realizadas ?? []) {
        if (!sr.completada || sr.tipo === "calentamiento") continue;
        if (sr.kg !== null && sr.reps !== null) volumen += Number(sr.kg) * (sr.reps + (sr.reps_extra ?? 0));
        const p = sr.rutina_ejercicios?.series_prescritas?.find((x) => x.orden === sr.orden && x.tipo === sr.tipo);
        if (
          p &&
          evaluarSerie({
            repsPrescrito: { reps: p.reps, reps_max: p.reps_max },
            repsRealizado: { reps: sr.reps, reps_extra: sr.reps_extra },
            rirPrescrito: p.rir,
            rirRealizado: sr.rir,
          }) === "no_alcanzado"
        )
          cortas++;
      }
      const record = records.get(s.cliente_id);
      return {
        id: s.id,
        clienteId: s.cliente_id,
        nombre: nombres.get(s.cliente_id)!,
        foto: fotos.get(s.cliente_id) ?? null,
        dia: s.rutina_dias?.nombre ?? "Entreno",
        cuando: cuandoFue(s.fecha_inicio, ahora),
        minutos: Math.round((new Date(s.fecha_fin).getTime() - new Date(s.fecha_inicio).getTime()) / 60000),
        volumen: Math.round(volumen),
        cortas,
        prsPre: s.prs_pre,
        sensacion: s.sensacion,
        comentario: s.notas_cliente?.trim() || null,
        record: record ? `${record.ejercicio} ${record.kg} kg` : null,
      };
    });
  if (entrenos.length === 0) return null;
  return <TarjetasPorVer entrenos={entrenos} />;
}
