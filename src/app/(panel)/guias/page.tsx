import { redirect } from "next/navigation";
import { crearClienteServidor, obtenerUsuario } from "@/lib/supabase/servidor";
import SeccionesPanel from "@/componentes/SeccionesPanel";
import GestionGuias from "./GestionGuias";
import type { Guia } from "@/lib/guias";

export const dynamic = "force-dynamic";

/** Biblioteca › Guías: explicaciones para mandar por el chat. */
export default async function PaginaGuias() {
  const supabase = await crearClienteServidor();
  const user = await obtenerUsuario();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("guias")
    .select("id, titulo, contenido, video_url, orden")
    .order("orden")
    .order("creada_en");

  return (
    <>
      <SeccionesPanel grupo="biblioteca" />
      <GestionGuias guias={(data ?? []) as Guia[]} />
    </>
  );
}
