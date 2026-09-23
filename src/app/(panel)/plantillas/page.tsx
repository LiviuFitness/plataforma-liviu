import { crearClienteServidor } from "@/lib/supabase/servidor";
import Plantillas from "./Plantillas";
import type { Dieta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export interface PlantillaRutina {
  id: string;
  nombre: string;
  notas: string | null;
  /** Días por semana (los de la semana 1), no el total de filas. */
  dias_semana: number;
  semanas: number;
}

/** Cliente activo con lo que tiene ahora, para avisar antes de sustituirlo. */
export interface ClienteAsignable {
  id: string;
  nombre: string;
  rutinaActual: string | null;
  dietaActualKcal: number | null;
}

/** Pantalla "Plantillas": rutinas y dietas reutilizables. */
export default async function PaginaPlantillas() {
  const supabase = await crearClienteServidor();

  const [
    { data: rutinas },
    { data: dietas },
    { data: clientes },
    { data: rutinasClientes },
    { data: dietasClientes },
  ] = await Promise.all([
      supabase
        .from("rutinas")
        .select("id, nombre, notas, rutina_dias ( id, semana )")
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
      supabase
        .from("rutinas")
        .select("cliente_id, nombre")
        .eq("activa", true)
        .not("cliente_id", "is", null),
      supabase
        .from("dietas")
        .select("cliente_id, kcal_obj")
        .eq("activa", true)
        .eq("tipo", "entreno")
        .not("cliente_id", "is", null),
    ]);

  /* Una plantilla de 4 semanas con 4 días tiene 16 filas: contarlas
   * todas decía "16 días", que parece otra cosa. */
  const plantillasRutina: PlantillaRutina[] = (rutinas ?? []).map((r) => {
    const dias = (r.rutina_dias ?? []) as { id: string; semana: number | null }[];
    const semanas = Math.max(1, ...dias.map((d) => d.semana ?? 1));
    return {
      id: r.id,
      nombre: r.nombre,
      notas: r.notas,
      dias_semana: dias.filter((d) => (d.semana ?? 1) === 1).length,
      semanas,
    };
  });

  const rutinaDe = new Map(
    (rutinasClientes ?? []).map((r) => [r.cliente_id as string, r.nombre as string])
  );
  const dietaDe = new Map(
    (dietasClientes ?? []).map((d) => [d.cliente_id as string, d.kcal_obj as number])
  );
  const asignables: ClienteAsignable[] = (clientes ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    rutinaActual: rutinaDe.has(c.id) ? rutinaDe.get(c.id) || "Rutina sin nombre" : null,
    dietaActualKcal: dietaDe.get(c.id) ?? null,
  }));

  return (
    <Plantillas
      rutinas={plantillasRutina}
      dietas={(dietas ?? []) as Dieta[]}
      clientes={asignables}
    />
  );
}
