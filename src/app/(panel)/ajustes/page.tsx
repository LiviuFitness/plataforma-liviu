import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import Ajustes from "./Ajustes";
import type { Perfil } from "@/lib/tipos";
import type { RespuestaRapida } from "@/componentes/GestionRespuestas";

export const dynamic = "force-dynamic";

/** Ajustes del entrenador: datos, correo y contraseña. */
export default async function PaginaAjustes() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil) redirect("/login");

  /* Si la tabla no existe todavía, error: se avisa en la propia sección */
  const { data: respuestas, error: errorRespuestas } = await supabase
    .from("respuestas_rapidas")
    .select("id, texto, orden")
    .order("orden");

  return (
    <Ajustes
      perfil={perfil as Perfil}
      email={user.email ?? perfil.email}
      respuestas={(respuestas ?? []) as RespuestaRapida[]}
      respuestasDisponibles={!errorRespuestas}
    />
  );
}
