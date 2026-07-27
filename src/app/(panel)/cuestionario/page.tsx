import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import GestionPreguntas from "@/componentes/GestionPreguntas";
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

  return (
    <GestionPreguntas
      tabla="preguntas_revision"
      titulo="Cuestionario semanal"
      subtitulo="lo que le preguntas al cliente cada semana"
      notaPie="Solo las preguntas activas se muestran al cliente. Los clientes ven el cuestionario en Mi Progreso y lo responden una vez por semana."
      preguntas={(preguntas ?? []) as PreguntaRevision[]}
    />
  );
}
