import type { crearClienteServidor } from "./supabase/servidor";

/** Un ejercicio por el que se puede cambiar otro durante la sesión. */
export interface AlternativaSesion {
  id: string;
  nombre: string;
  grupo: string;
  material: string | null;
  videoUrl: string | null;
  tecnica: string | null;
  /** La eligió el entrenador para ese ejercicio (sale primero). */
  aprobada: boolean;
}

interface FilaEjercicio {
  id: string;
  nombre: string;
  grupo_muscular: string;
  material: string | null;
  video_url: string | null;
  instrucciones: string | null;
}

const MAX_OTRAS = 8;

/**
 * "¿Máquina ocupada?": para cada ejercicio del día, primero las
 * alternativas que el entrenador aprobó en la biblioteca y después otras
 * del mismo grupo muscular. Nunca salen los ejercicios que el cliente
 * tiene marcados para evitar ni los que ya están en el día.
 */
export async function cargarAlternativas(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  ejerciciosDelDia: { ejercicioId: string; grupo: string }[],
  clienteId: string
): Promise<Map<string, AlternativaSesion[]>> {
  const ids = [...new Set(ejerciciosDelDia.map((e) => e.ejercicioId))];
  const resultado = new Map<string, AlternativaSesion[]>();
  if (ids.length === 0) return resultado;

  const [{ data: biblioteca }, { data: aprobadas }, { data: excluidos }] = await Promise.all([
    supabase
      .from("ejercicios")
      .select("id, nombre, grupo_muscular, material, video_url, instrucciones")
      .order("nombre"),
    supabase
      .from("ejercicio_alternativas")
      .select("ejercicio_id, alternativa_id, orden")
      .in("ejercicio_id", ids)
      .order("orden"),
    supabase.from("ejercicios_excluidos").select("ejercicio_id").eq("cliente_id", clienteId),
  ]);

  const lista = (biblioteca ?? []) as FilaEjercicio[];
  const porId = new Map(lista.map((e) => [e.id, e]));
  const fuera = new Set([...(excluidos ?? []).map((x) => x.ejercicio_id as string), ...ids]);
  const aSesion = (e: FilaEjercicio, aprobada: boolean): AlternativaSesion => ({
    id: e.id,
    nombre: e.nombre,
    grupo: e.grupo_muscular,
    material: e.material,
    videoUrl: e.video_url,
    tecnica: e.instrucciones,
    aprobada,
  });

  for (const { ejercicioId, grupo } of ejerciciosDelDia) {
    if (resultado.has(ejercicioId)) continue;
    const elegidas = (aprobadas ?? [])
      .filter((a) => a.ejercicio_id === ejercicioId && !fuera.has(a.alternativa_id))
      .map((a) => porId.get(a.alternativa_id))
      .filter((e): e is FilaEjercicio => !!e);
    const yaEstan = new Set(elegidas.map((e) => e.id));
    const otras = lista
      .filter((e) => e.grupo_muscular === grupo && !fuera.has(e.id) && !yaEstan.has(e.id))
      .slice(0, MAX_OTRAS);
    resultado.set(ejercicioId, [
      ...elegidas.map((e) => aSesion(e, true)),
      ...otras.map((e) => aSesion(e, false)),
    ]);
  }
  return resultado;
}
