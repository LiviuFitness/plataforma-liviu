import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";
import { inicioSemana } from "@/lib/habitos";
import MiRutina from "./MiRutina";

export const dynamic = "force-dynamic";

/**
 * El plan del cliente: la semana entera, cada día con sus ejercicios y
 * series, y el botón para empezar el que quiera.
 *
 * Hasta ahora esto no existía en ningún sitio: la única forma de ver qué
 * tenía un día era entrar a entrenarlo, y solo se podían empezar los
 * días que la Home listaba debajo de la tarjeta de hoy.
 */
export default async function PaginaMiRutina() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const lunes = inicioSemana().toISOString();

  const [{ data: rutinaFila }, { data: sesiones }] = await Promise.all([
    supabase
      .from("rutinas")
      .select(SELECT_RUTINA_COMPLETA)
      .eq("cliente_id", user.id)
      .eq("activa", true)
      .order("creada_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Las de esta semana marcan los días ya hechos; la última de todas
    // decide cuál toca ahora (mismo criterio que la Home).
    supabase
      .from("sesiones")
      .select("dia_id, fecha_inicio")
      .eq("cliente_id", user.id)
      .order("fecha_inicio", { ascending: false })
      .limit(60),
  ]);

  const completa = rutinaFila ? aRutinaUI(rutinaFila as unknown as FilaRutina) : null;
  const dias =
    completa?.dias.filter((d) => d.semana === completa.semana_actual) ?? [];

  const listaSesiones = sesiones ?? [];
  const hechosEstaSemana = new Set(
    listaSesiones.filter((s) => s.fecha_inicio >= lunes && s.dia_id).map((s) => s.dia_id as string)
  );

  // El siguiente sugerido: el que va detrás del último que entrenó.
  let indiceSiguiente = 0;
  const ultimoDiaId = listaSesiones.find((s) => s.dia_id)?.dia_id;
  const indiceUltimo = dias.findIndex((d) => d.id === ultimoDiaId);
  if (indiceUltimo >= 0) indiceSiguiente = (indiceUltimo + 1) % dias.length;

  return (
    <MiRutina
      nombreRutina={completa?.nombre ?? ""}
      notas={completa?.notas ?? ""}
      semana={completa?.semana_actual ?? 1}
      dias={dias}
      hechosEstaSemana={[...hechosEstaSemana]}
      idSiguiente={dias[indiceSiguiente]?.id ?? null}
    />
  );
}
