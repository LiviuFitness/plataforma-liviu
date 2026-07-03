import { notFound, redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import SesionEnCurso, { type EjercicioSesion } from "./SesionEnCurso";
import type { TipoSerie } from "@/lib/tipos";

export const dynamic = "force-dynamic";

interface FilaSerie {
  orden: number;
  tipo: TipoSerie;
  kg: number | null;
  reps: number | null;
  rir: number | null;
}

interface FilaEjercicio {
  id: string;
  orden: number;
  descanso_seg: number;
  notas: string | null;
  ejercicios: { nombre: string; grupo_muscular: string } | null;
  series_prescritas: FilaSerie[];
}

/** Sesión de entrenamiento: carga el día prescrito del cliente. */
export default async function PaginaSesion({
  params,
}: {
  params: Promise<{ diaId: string }>;
}) {
  const { diaId } = await params;
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS garantiza que el cliente solo puede leer días de SU rutina
  const { data: dia } = await supabase
    .from("rutina_dias")
    .select(
      `id, nombre,
       rutina_ejercicios (
         id, orden, descanso_seg, notas, ejercicio_id,
         ejercicios ( nombre, grupo_muscular ),
         series_prescritas ( orden, tipo, kg, reps, rir )
       )`
    )
    .eq("id", diaId)
    .maybeSingle();

  if (!dia) notFound();

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
      series: (e.series_prescritas ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((s) => ({
          tipo: s.tipo,
          kg: s.kg === null ? "" : String(s.kg),
          reps: s.reps === null ? "" : String(s.reps),
          rir: s.rir === null ? "" : String(s.rir),
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
