import type { crearClienteNavegador } from "@/lib/supabase/cliente";

type Supabase = ReturnType<typeof crearClienteNavegador>;

/**
 * Copias completas de una rutina o de una dieta, con todo lo que cuelga
 * de ellas. Las usan "Guardar como plantilla" (rutina de un cliente →
 * Biblioteca) y "Duplicar plantilla".
 *
 * Se hace desde el navegador con las políticas del entrenador, sin
 * funciones nuevas en la base de datos, en el mismo orden en que se
 * lee: primero el contenedor, luego sus hijos, emparejando cada hijo
 * nuevo con el suyo por la posición en que se insertó.
 */

interface FilaSerie {
  orden: number;
  tipo: string;
  kg: number | null;
  reps: number | null;
  rir: number | null;
  reps_max: number | null;
  tecnica: string | null;
  carga_texto: string | null;
}
interface FilaEjercicio {
  ejercicio_id: string;
  orden: number;
  descanso_seg: number;
  notas: string | null;
  grupo_superserie: string | null;
  series_prescritas: FilaSerie[];
}
interface FilaDia {
  orden: number;
  nombre: string;
  semana: number;
  rutina_ejercicios: FilaEjercicio[];
}

/** Copia una rutina entera (todas sus semanas). Devuelve el id nuevo. */
export async function copiarRutina(
  supabase: Supabase,
  rutinaId: string,
  destino: { nombre: string; cliente_id: string | null; es_plantilla: boolean; activa: boolean }
): Promise<string | null> {
  const { data: origen, error } = await supabase
    .from("rutinas")
    .select(
      `notas, semana_actual,
       rutina_dias ( orden, nombre, semana,
         rutina_ejercicios ( ejercicio_id, orden, descanso_seg, notas, grupo_superserie,
           series_prescritas ( orden, tipo, kg, reps, rir, reps_max, tecnica, carga_texto ) ) )`
    )
    .eq("id", rutinaId)
    .maybeSingle();
  if (error || !origen) return null;

  const { data: nueva, error: e1 } = await supabase
    .from("rutinas")
    .insert({
      ...destino,
      notas: origen.notas,
      /* Una plantilla empieza siempre por la semana 1 */
      semana_actual: destino.es_plantilla ? 1 : origen.semana_actual,
    })
    .select("id")
    .single();
  if (e1 || !nueva) return null;
  /* A partir de aquí, si algo falla se borra la copia a medias (lo que
   * cuelga de ella se va en cascada): mejor nada que media plantilla. */
  const deshacer = async () => {
    await supabase.from("rutinas").delete().eq("id", nueva.id);
    return null;
  };

  /* Cada día conserva su posición original, huecos incluidos: si se
   * borró un día solo en una semana, esa semana tiene 0, 1, 3, y
   * renumerarla rompería el emparejamiento con las demás. */
  const dias = ((origen.rutina_dias ?? []) as unknown as FilaDia[])
    .slice()
    .sort((a, b) => a.semana - b.semana || a.orden - b.orden);
  if (dias.length === 0) return nueva.id;

  const { data: diasNuevos, error: e2 } = await supabase
    .from("rutina_dias")
    .insert(dias.map((d) => ({ rutina_id: nueva.id, orden: d.orden, nombre: d.nombre, semana: d.semana })))
    .select("id, orden, semana");
  if (e2 || !diasNuevos || diasNuevos.length !== dias.length) return deshacer();
  /* Postgres devuelve las filas en el orden en que se insertaron; se
   * comprueba fila a fila antes de fiarse, porque dos días con la misma
   * semana y posición (datos antiguos) no se distinguirían por clave. */
  const mismoOrden = diasNuevos.every(
    (n, i) => n.semana === dias[i].semana && n.orden === dias[i].orden
  );
  if (!mismoOrden) return deshacer();
  const idsDias = diasNuevos.map((d) => d.id as string);

  /* Ejercicios de todos los días en una sola inserción; cada uno lleva
   * un índice para emparejar luego sus series sin depender de que dos
   * ejercicios de un día compartan número de orden. */
  const ejercicios = dias.flatMap((d, di) =>
    (d.rutina_ejercicios ?? [])
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((e, i) => ({ dia: idsDias[di], e, i }))
  );
  if (ejercicios.length === 0) return nueva.id;

  const { data: ejNuevos, error: e3 } = await supabase
    .from("rutina_ejercicios")
    .insert(
      ejercicios.map(({ dia, e, i }) => ({
        dia_id: dia,
        ejercicio_id: e.ejercicio_id,
        orden: i,
        descanso_seg: e.descanso_seg,
        notas: e.notas,
        grupo_superserie: e.grupo_superserie,
      }))
    )
    .select("id, dia_id, orden");
  if (e3 || !ejNuevos) return deshacer();
  const idEj = new Map(ejNuevos.map((e) => [`${e.dia_id}:${e.orden}`, e.id as string]));

  const series = ejercicios.flatMap(({ dia, e, i }) =>
    (e.series_prescritas ?? []).map((s) => ({ ...s, rutina_ejercicio_id: idEj.get(`${dia}:${i}`)! }))
  );
  if (series.length > 0) {
    const { error: e4 } = await supabase.from("series_prescritas").insert(series);
    if (e4) return deshacer();
  }
  return nueva.id;
}

interface FilaComida {
  orden: number;
  nombre: string;
  descripcion_libre: string | null;
  dieta_comida_alimentos: { alimento_id: string; gramos: number; orden: number }[];
}

/** Copia una dieta con sus comidas y alimentos. Devuelve el id nuevo. */
export async function copiarDieta(
  supabase: Supabase,
  dietaId: string,
  destino: { nombre: string; cliente_id: string | null; es_plantilla: boolean; activa: boolean }
): Promise<string | null> {
  const { data: origen, error } = await supabase
    .from("dietas")
    .select(
      `kcal_obj, prot_obj, carb_obj, gras_obj, tipo,
       dieta_comidas ( orden, nombre, descripcion_libre,
         dieta_comida_alimentos ( alimento_id, gramos, orden ) )`
    )
    .eq("id", dietaId)
    .maybeSingle();
  if (error || !origen) return null;

  const { data: nueva, error: e1 } = await supabase
    .from("dietas")
    .insert({
      ...destino,
      kcal_obj: origen.kcal_obj,
      prot_obj: origen.prot_obj,
      carb_obj: origen.carb_obj,
      gras_obj: origen.gras_obj,
      tipo: origen.tipo,
    })
    .select("id")
    .single();
  if (e1 || !nueva) return null;
  const deshacer = async () => {
    await supabase.from("dietas").delete().eq("id", nueva.id);
    return null;
  };

  const comidas = ((origen.dieta_comidas ?? []) as unknown as FilaComida[])
    .slice()
    .sort((a, b) => a.orden - b.orden);
  if (comidas.length === 0) return nueva.id;

  const { data: comidasNuevas, error: e2 } = await supabase
    .from("dieta_comidas")
    .insert(
      comidas.map((c, i) => ({
        dieta_id: nueva.id,
        orden: i,
        nombre: c.nombre,
        descripcion_libre: c.descripcion_libre,
      }))
    )
    .select("id, orden");
  if (e2 || !comidasNuevas) return deshacer();
  const idComida = new Map(comidasNuevas.map((c) => [c.orden as number, c.id as string]));

  const alimentos = comidas.flatMap((c, i) =>
    (c.dieta_comida_alimentos ?? []).map((a) => ({
      comida_id: idComida.get(i)!,
      alimento_id: a.alimento_id,
      gramos: a.gramos,
      orden: a.orden,
    }))
  );
  if (alimentos.length > 0) {
    const { error: e3 } = await supabase.from("dieta_comida_alimentos").insert(alimentos);
    if (e3) return deshacer();
  }
  return nueva.id;
}
