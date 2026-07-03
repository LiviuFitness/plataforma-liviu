import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { aRutinaUI, SELECT_RUTINA_COMPLETA, type FilaRutina } from "@/lib/rutinas";
import EditorPlantillaEntreno from "./EditorPlantillaEntreno";
import type { Ejercicio } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/** Editor de una plantilla de entreno. */
export default async function PaginaPlantillaEntreno({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const [{ data: rutina }, { data: biblioteca }] = await Promise.all([
    supabase
      .from("rutinas")
      .select(SELECT_RUTINA_COMPLETA)
      .eq("id", id)
      .eq("es_plantilla", true)
      .maybeSingle(),
    supabase.from("ejercicios").select("*").order("nombre"),
  ]);

  if (!rutina) notFound();

  return (
    <EditorPlantillaEntreno
      rutina={aRutinaUI(rutina as unknown as FilaRutina)}
      biblioteca={(biblioteca ?? []) as Ejercicio[]}
    />
  );
}
