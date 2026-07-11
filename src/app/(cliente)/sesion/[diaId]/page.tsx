import { notFound, redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { componerCarga, componerReps, componerRir } from "@/lib/rutinas";
import SesionEnCurso, { type EjercicioSesion } from "@/componentes/SesionEnCurso";
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
  series_realizadas: FilaSerieRealizada[];
}

/** Sesión de entrenamiento: carga el día prescrito y lo realizado la última vez. */
export default async function PaginaSesion({
  params,
}: {
  params: Promise<{ diaId: string }>;
}) {
  const { diaId } = await params;
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  // RLS garantiza que el cliente solo puede leer días de SU rutina
  const [{ data: dia }, { data: previas }] = await Promise.all([
    supabase
      .from("rutina_dias")
      .select(
        `id, nombre,
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
        `fecha_inicio,
         series_realizadas ( orden, kg, carga_texto, reps, reps_extra, completada, tipo,
           rutina_ejercicios ( ejercicio_id ) )`
      )
      .eq("cliente_id", user.id)
      .order("fecha_inicio", { ascending: false })
      .limit(15),
  ]);

  if (!dia) notFound();

  // "Última vez" por ejercicio (estilo Hevy): la sesión más reciente
  // en la que el cliente hizo ese ejercicio. También la mejor marca
  // histórica en kg, para detectar récords al terminar la sesión.
  const anterior = new Map<string, string>();
  const mejorHistorico = new Map<string, number>();
  for (const sesion of (previas ?? []) as unknown as FilaSesionPrevia[]) {
    const porEjercicio = new Map<string, FilaSerieRealizada[]>();
    for (const s of sesion.series_realizadas ?? []) {
      const id = s.rutina_ejercicios?.ejercicio_id;
      if (!id || !s.completada || s.tipo === "calentamiento") continue;
      if (s.kg !== null && Number(s.kg) > (mejorHistorico.get(id) ?? 0)) {
        mejorHistorico.set(id, Number(s.kg));
      }
      const lista = porEjercicio.get(id) ?? [];
      lista.push(s);
      porEjercicio.set(id, lista);
    }
    for (const [id, series] of porEjercicio) {
      if (anterior.has(id)) continue;
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
      if (texto) anterior.set(id, texto);
    }
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
      clienteId={user.id}
      diaId={dia.id}
      nombreDia={dia.nombre}
      ejerciciosIniciales={ejercicios}
    />
  );
}
