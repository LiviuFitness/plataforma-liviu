import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import EditorPlantillaDieta from "./EditorPlantillaDieta";
import type { Dieta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Editor de una plantilla de dieta. */
export default async function PaginaPlantillaDieta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const { data: dieta } = await supabase
    .from("dietas")
    .select("*, dieta_comidas ( id, dieta_id, orden, nombre, descripcion_libre )")
    .eq("id", id)
    .eq("es_plantilla", true)
    .maybeSingle();

  if (!dieta) notFound();

  return <EditorPlantillaDieta dieta={dieta as Dieta} />;
}
