import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { SELECT_DIETA_COMPLETA, type Alimento } from "@/lib/dietas";
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

  const [{ data: dieta }, { data: alimentos }] = await Promise.all([
    supabase
      .from("dietas")
      .select(SELECT_DIETA_COMPLETA)
      .eq("id", id)
      .eq("es_plantilla", true)
      .maybeSingle(),
    supabase
      .from("alimentos")
      .select("id, nombre, kcal_100, prot_100, carb_100, gras_100, fibra_100")
      .order("nombre"),
  ]);

  if (!dieta) notFound();

  return (
    <EditorPlantillaDieta
      dieta={dieta as Dieta}
      alimentos={(alimentos ?? []) as Alimento[]}
    />
  );
}
