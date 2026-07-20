import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import GestionCuestionario from "./GestionCuestionario";
import type { PreguntaRevision } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Preguntas del cuestionario de revisión semanal — el entrenador las
 * define aquí (no vienen fijas en el código) y el cliente las responde
 * cada semana desde Mi Progreso. */
export default async function PaginaCuestionario() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data: preguntas } = await supabase
    .from("preguntas_revision")
    .select("id, texto, orden, activa")
    .order("orden");

  return <GestionCuestionario preguntas={(preguntas ?? []) as PreguntaRevision[]} />;
}
