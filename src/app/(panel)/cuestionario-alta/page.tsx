import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import GestionPreguntas from "@/componentes/GestionPreguntas";
import type { PreguntaAlta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Preguntas del cuestionario de alta — el cliente nuevo las responde
 * una sola vez durante el onboarding, antes del tour de bienvenida. */
export default async function PaginaCuestionarioAlta() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data: preguntas } = await supabase
    .from("preguntas_alta")
    .select("id, texto, orden, activa")
    .order("orden");

  return (
    <GestionPreguntas
      tabla="preguntas_alta"
      titulo="Cuestionario de alta"
      subtitulo="lo que le preguntas a un cliente nuevo al empezar"
      notaPie="Solo las preguntas activas se muestran. El cliente las responde una sola vez, al final del onboarding, antes de entrar por primera vez a la app."
      preguntas={(preguntas ?? []) as PreguntaAlta[]}
    />
  );
}
