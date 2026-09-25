import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import SeccionesPanel from "@/componentes/SeccionesPanel";
import CatalogoEjercicios from "./CatalogoEjercicios";
import type { Ejercicio } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Biblioteca de ejercicios: ponerles vídeo o GIF y técnica a los que
 * no tienen, y elegir sus alternativas para "¿máquina ocupada?". */
export default async function PaginaEjercicios() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const [{ data }, { data: alternativas }] = await Promise.all([
    supabase
      .from("ejercicios")
      .select("id, nombre, nombre_en, grupo_muscular, material, instrucciones, video_url, creado_por")
      .order("nombre"),
    supabase.from("ejercicio_alternativas").select("ejercicio_id, alternativa_id").order("orden"),
  ]);

  return (
    <>
      <SeccionesPanel grupo="biblioteca" />
      <CatalogoEjercicios
        ejercicios={(data ?? []) as Ejercicio[]}
        alternativas={(alternativas ?? []) as { ejercicio_id: string; alternativa_id: string }[]}
      />
    </>
  );
}
