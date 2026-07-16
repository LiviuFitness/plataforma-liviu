import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { componerCarga, componerReps, componerRir } from "@/lib/rutinas";
import SesionEnCurso, {
  type EjercicioSesion,
  type SesionAnterior,
} from "@/componentes/SesionEnCurso";
import type { TipoSerie } from "@/lib/tipos";

export const dynamic = "force-dynamic";

interface FilaSerie {
  orden: number;
  tipo: TipoSerie;
  kg: number | null;
  reps: number | null;
  rir: number | null;
  reps_max: number | null;
  tecnica: string | null;
  carga_texto: string | null;
}

interface FilaEjercicio {
  id: string;
  orden: number;
  descanso_seg: number;
  notas: string | null;
  ejercicio_id: string;
  grupo_superserie: string | null;
  ejercicios: {
    nombre: string;
    grupo_muscular: string;
    instrucciones: string | null;
    video_url: string | null;
  } | null;
  series_prescritas: FilaSerie[];
}

interface FilaSerieRealizada {
  orden: number;
  kg: number | null;
  carga_texto: string | null;
  reps: number | null;
  reps_extra: number | null;
  completada: boolean;
  tipo: string;
  rutina_ejercicios: { ejercicio_id: string } | null;
}

interface FilaSesionPrevia {
  fecha_inicio: string;
  fecha_fin: string | null;
  rutina_dias: { nombre: string; rutina_id: string } | null;
  series_realizadas: FilaSerieRealizada[];
}

/** Sesión presencial: el entrenador registra en el momento las cargas y
 * repeticiones de un cliente que está entrenando delante de él. Mismo
 * componente que usa el cliente para su propio entreno. */
export default async function PaginaSesionPresencial({
  params,
}: {
  params: Promise<{ id: string; diaId: string }>;
}) {
  const { id, diaId } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: perfil }, { data: dia }, { data: previas }] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", id).maybeSingle(),
    supabase
      .from("rutina_dias")
      .select(
        `id, nombre, rutina_id,
         rutina_ejercicios (
           id, orden, descanso_seg, notas, ejercicio_id, grupo_superserie,
           ejercicios ( nombre, grupo_muscular, instrucciones, video_url ),
           series_prescritas ( orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto )
         )`
      )
      .eq("id", diaId)
      .maybeSingle(),
    supabase
      .from("sesiones")
      .select(
        `fecha_inicio, fecha_fin, rutina_dias ( nombre, rutina_id ),
         series_realizadas ( orden, kg, carga_texto, reps, reps_extra, completada, tipo,
           rutina_ejercicios ( ejercicio_id ) )`
      )
      .eq("cliente_id", id)
      .order("fecha_inicio", { ascending: false })
      .limit(15),
  ]);

  if (!dia || !perfil) notFound();

  // "Última vez" por ejercicio (estilo Hevy): la sesión más reciente
  // en la que el cliente hizo ese ejercicio. También la mejor marca
  // histórica en kg, para detectar récords al terminar la sesión.
  const anterior = new Map<string, string>();
  const mejorHistorico = new Map<string, number>();
  for (const sesion of (previas ?? []) as unknown as FilaSesionPrevia[]) {
    const porEjercicio = new Map<string, FilaSerieRealizada[]>();
    for (const s of sesion.series_realizadas ?? []) {
      const ejercicioId = s.rutina_ejercicios?.ejercicio_id;
      if (!ejercicioId || !s.completada || s.tipo === "calentamiento") continue;
      if (s.kg !== null && Number(s.kg) > (mejorHistorico.get(ejercicioId) ?? 0)) {
        mejorHistorico.set(ejercicioId, Number(s.kg));
      }
      const lista = porEjercicio.get(ejercicioId) ?? [];
      lista.push(s);
      porEjercicio.set(ejercicioId, lista);
    }
    for (const [ejercicioId, series] of porEjercicio) {
      if (anterior.has(ejercicioId)) continue;
      const texto = series
        .sort((a, b) => a.orden - b.orden)
        .map((s) => {
          const carga = componerCarga(
            s.kg === null ? null : Number(s.kg),
            s.carga_texto
          );
          const reps =
            s.reps === null
              ? "?"
              : s.reps_extra
                ? `${s.reps}+${s.reps_extra}`
                : String(s.reps);
          return `${carga || "—"}×${reps}`;
        })
        .join(" · ");
      if (texto) anterior.set(ejercicioId, texto);
    }
  }

  // Sesión anterior de este MISMO día de rutina (para la comparación del
  // resumen final: volumen/series/reps/duración). No se puede filtrar
  // por dia_id directo: al duplicar una semana, el entrenador crea un
  // rutina_dias nuevo (id distinto) aunque sea "el mismo día" del
  // mesociclo — por eso se correlaciona por nombre + rutina, igual que
  // el resto de este archivo evita depender del id exacto del día.
  const filaAnterior = ((previas ?? []) as unknown as FilaSesionPrevia[]).find(
    (s) => s.rutina_dias?.nombre === dia.nombre && s.rutina_dias?.rutina_id === dia.rutina_id
  );
  let sesionAnterior: SesionAnterior | null = null;
  if (filaAnterior) {
    let volumen = 0;
    let series = 0;
    let reps = 0;
    for (const s of filaAnterior.series_realizadas ?? []) {
      if (!s.completada) continue;
      series++;
      const r = (s.reps ?? 0) + (s.reps_extra ?? 0);
      reps += r;
      if (s.kg !== null) volumen += Number(s.kg) * r;
    }
    sesionAnterior = {
      volumen,
      series,
      reps,
      duracionSeg: filaAnterior.fecha_fin
        ? Math.round(
            (new Date(filaAnterior.fecha_fin).getTime() -
              new Date(filaAnterior.fecha_inicio).getTime()) /
              1000
          )
        : null,
    };
  }

  const ejercicios: EjercicioSesion[] = (
    (dia.rutina_ejercicios ?? []) as unknown as FilaEjercicio[]
  )
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .map((e) => ({
      rutinaEjercicioId: e.id,
      nombre: e.ejercicios?.nombre ?? "Ejercicio",
      grupo: e.ejercicios?.grupo_muscular ?? "",
      descansoSeg: e.descanso_seg,
      notas: e.notas ?? "",
      grupoSuperserie: e.grupo_superserie,
      tecnica: e.ejercicios?.instrucciones ?? null,
      videoUrl: e.ejercicios?.video_url ?? null,
      anterior: anterior.get(e.ejercicio_id) ?? null,
      mejorKgAnterior: mejorHistorico.get(e.ejercicio_id) ?? null,
      series: (e.series_prescritas ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((s) => ({
          tipo: s.tipo,
          kgPrescrito: componerCarga(s.kg === null ? null : Number(s.kg), s.carga_texto),
          repsPrescrito: componerReps(s.reps, s.reps_max),
          rirPrescrito: componerRir(s.rir, s.tecnica),
          kg: "",
          reps: "",
          rir: "",
          completada: false,
        })),
    }));

  return (
    <SesionEnCurso
      clienteId={id}
      diaId={dia.id}
      nombreDia={dia.nombre}
      ejerciciosIniciales={ejercicios}
      volverA={`/clientes/${id}`}
      nombreCliente={perfil.nombre}
      sesionAnterior={sesionAnterior}
      analisisHref={`/clientes/${id}`}
    />
  );
}
