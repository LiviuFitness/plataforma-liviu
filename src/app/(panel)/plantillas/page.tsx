import { crearClienteServidor } from "@/lib/supabase/servidor";
import Plantillas from "./Plantillas";
import type { Dieta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export interface PlantillaRutina {
  id: string;
  nombre: string;
  notas: string | null;
  num_dias: number;
}

/** Pantalla "Plantillas": rutinas y dietas reutilizables. */
export default async function PaginaPlantillas() {
  const supabase = await crearClienteServidor();

  const [{ data: rutinas }, { data: dietas }, { data: clientes }] =
    await Promise.all([
      supabase
        .from("rutinas")
        .select("id, nombre, notas, rutina_dias ( id )")
        .eq("es_plantilla", true)
        .order("creada_en", { ascending: false }),
      supabase
        .from("dietas")
        .select("*, dieta_comidas ( id, dieta_id, orden, nombre, descripcion_libre )")
        .eq("es_plantilla", true)
        .order("creada_en", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, nombre")
        .eq("rol", "cliente")
        .eq("estado", "activo")
        .order("nombre"),
    ]);

  const plantillasRutina: PlantillaRutina[] = (rutinas ?? []).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    notas: r.notas,
    num_dias: (r.rutina_dias ?? []).length,
  }));

  return (
    <Plantillas
      rutinas={plantillasRutina}
      dietas={(dietas ?? []) as Dieta[]}
      clientes={clientes ?? []}
    />
  );
}
