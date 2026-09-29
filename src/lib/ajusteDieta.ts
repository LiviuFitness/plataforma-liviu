import {
  itemsDeOpcion,
  macrosDe,
  sumar,
  type Alimento,
  type ComidaEstructurada,
  type Totales,
} from "@/lib/dietas";
import type { Dieta } from "@/lib/tipos";

/**
 * Ajuste de cantidades: convierte "−150 kcal" en gramos concretos de su
 * dieta, como lo haría Liviu a mano:
 *  · solo se tocan los carbohidratos (arroz, pasta, patata, pan…) y las
 *    grasas (aceite, aguacate, frutos secos…), por su categoría; la
 *    proteína, los lácteos, la fruta y la verdura no se tocan;
 *  · 75 % del cambio sale de los hidratos y 25 % de la grasa;
 *  · a cada ración de ese grupo, el mismo porcentaje (como mucho un
 *    40 %) y en saltos de 5 g;
 *  · la opción B de cada comida se ajusta en la misma proporción.
 * Subir funciona igual al revés.
 */

export interface CambioAlimento {
  itemId: string;
  comida: string;
  alimento: string;
  opcion: 0 | 1;
  antes: number;
  despues: number;
}

export interface PropuestaAjuste {
  dietaId: string;
  tipo: "entreno" | "descanso";
  cambios: CambioAlimento[];
  antes: Totales;
  despues: Totales;
  /** Objetivos nuevos de la dieta */
  objetivos: { kcal_obj: number; prot_obj: number; carb_obj: number; gras_obj: number };
}

type Grupo = "carb" | "gras";

/** De qué grupo es un alimento para el ajuste (null: no se toca) */
function grupo(a: Alimento): Grupo | null {
  if (a.categoria === "carbohidrato") return "carb";
  if (a.categoria === "grasa") return "gras";
  if (a.categoria) return null;
  /* Sin categoría: por su macro principal, y si aporta proteína de
   * verdad (≥30 % de sus kcal), se deja como está */
  const p = Number(a.prot_100) * 4;
  const c = Number(a.carb_100) * 4;
  const g = Number(a.gras_100) * 9;
  const total = p + c + g;
  if (total <= 0 || p / total >= 0.3) return null;
  return c >= g ? "carb" : "gras";
}

const cinco = (g: number) => Math.max(5, Math.round(g / 5) * 5);

export function proponerAjuste(plan: { dieta: Dieta; comidas: ComidaEstructurada[] }, deltaKcal: number): PropuestaAjuste {
  const { dieta, comidas } = plan;
  const itemsA = comidas.flatMap((c) => itemsDeOpcion(c, 0).filter((i) => i.alimentos));
  const nuevos = new Map<string, number>();

  const deGrupo = (m: Grupo) => itemsA.filter((i) => grupo(i.alimentos!) === m && Number(i.gramos) > 0);
  const kcalDe = (m: Grupo) => deGrupo(m).reduce((s, i) => s + (Number(i.alimentos!.kcal_100) * Number(i.gramos)) / 100, 0);
  const disponible: Record<Grupo, number> = { carb: kcalDe("carb"), gras: kcalDe("gras") };
  /* 75/25, y lo que no quepa en un grupo (como mucho un 40 % de lo suyo)
   * pasa al otro */
  const kcal: Record<Grupo, number> = { carb: deltaKcal * 0.75, gras: deltaKcal * 0.25 };
  for (const [m, otro] of [["carb", "gras"], ["gras", "carb"]] as const) {
    const tope = disponible[m] * 0.4;
    if (Math.abs(kcal[m]) > tope) {
      kcal[otro] += kcal[m] - Math.sign(kcal[m]) * tope;
      kcal[m] = Math.sign(kcal[m]) * tope;
    }
  }

  for (const m of ["carb", "gras"] as const) {
    /* El mismo porcentaje a cada ración del grupo, en kcal reales */
    const lista = deGrupo(m);
    const kcalGrupo = disponible[m];
    if (kcalGrupo <= 0 || kcal[m] === 0) continue;
    const factor = Math.min(1.4, Math.max(0.6, 1 + kcal[m] / kcalGrupo));
    for (const i of lista) {
      const antes = Number(i.gramos);
      const despues = cinco(antes * factor);
      if (despues !== antes) nuevos.set(i.id, despues);
    }
  }

  /* La opción B: misma proporción que la A de esa comida, por grupo */
  for (const c of comidas) {
    const a = itemsDeOpcion(c, 0).filter((i) => i.alimentos);
    const b = itemsDeOpcion(c, 1).filter((i) => i.alimentos);
    if (b.length === 0) continue;
    for (const m of ["carb", "gras"] as const) {
      const suyosA = a.filter((i) => grupo(i.alimentos!) === m);
      const antes = suyosA.reduce((s, i) => s + Number(i.gramos), 0);
      const despues = suyosA.reduce((s, i) => s + (nuevos.get(i.id) ?? Number(i.gramos)), 0);
      if (antes <= 0 || despues === antes) continue;
      for (const i of b.filter((x) => grupo(x.alimentos!) === m && Number(x.gramos) > 0)) {
        const g = cinco((Number(i.gramos) * despues) / antes);
        if (g !== Number(i.gramos)) nuevos.set(i.id, g);
      }
    }
  }

  const cambios: CambioAlimento[] = comidas.flatMap((c) =>
    (c.dieta_comida_alimentos ?? [])
      .filter((i) => i.alimentos && nuevos.has(i.id))
      .sort((x, y) => (x.opcion ?? 0) - (y.opcion ?? 0) || x.orden - y.orden)
      .map((i) => ({
        itemId: i.id,
        comida: c.nombre,
        alimento: i.alimentos!.nombre,
        opcion: (i.opcion ?? 0) === 1 ? (1 as const) : (0 as const),
        antes: Number(i.gramos),
        despues: nuevos.get(i.id)!,
      }))
  );

  const totales = (conCambios: boolean) =>
    sumar(itemsA.map((i) => macrosDe(i.alimentos!, conCambios ? (nuevos.get(i.id) ?? Number(i.gramos)) : Number(i.gramos))));
  const antes = totales(false);
  const despues = totales(true);

  return {
    dietaId: dieta.id,
    tipo: dieta.tipo,
    cambios,
    antes,
    despues,
    objetivos: {
      kcal_obj: Math.max(800, Math.round(Number(dieta.kcal_obj) + (despues.kcal - antes.kcal))),
      prot_obj: Math.round(Number(dieta.prot_obj)),
      carb_obj: Math.max(0, Math.round(Number(dieta.carb_obj) + (despues.carb - antes.carb))),
      gras_obj: Math.max(0, Math.round(Number(dieta.gras_obj) + (despues.gras - antes.gras))),
    },
  };
}

/** Cliente de Supabase (el del navegador del entrenador) */
type Db = ReturnType<typeof import("@/lib/supabase/cliente").crearClienteNavegador>;

/**
 * Aplica el ajuste: gramos nuevos y objetivos nuevos en sus dietas, y
 * deja constancia en revisiones_kcal con la lista de cambios (el cliente
 * la ve en Mi dieta y en Mi progreso). Devuelve true si todo fue bien.
 */
export async function aplicarAjuste(
  supabase: Db,
  d: {
    clienteId: string;
    dietaEntreno: { id: string; kcal: number };
    propuestas: PropuestaAjuste[];
    delta: number;
    motivo: string;
  }
): Promise<boolean> {
  const resultados = await Promise.all(
    d.propuestas.flatMap((p) => [
      ...p.cambios.map((c) => supabase.from("dieta_comida_alimentos").update({ gramos: c.despues }).eq("id", c.itemId)),
      supabase.from("dietas").update(p.objetivos).eq("id", p.dietaId),
    ])
  );
  if (resultados.some((r) => r.error)) return false;
  const entreno = d.propuestas.find((p) => p.tipo === "entreno");
  const fila = {
    cliente_id: d.clienteId,
    dieta_id: d.dietaEntreno.id,
    kcal_anterior: d.dietaEntreno.kcal,
    kcal_nuevo: entreno ? entreno.objetivos.kcal_obj : Math.max(800, d.dietaEntreno.kcal + d.delta),
    delta: d.delta,
    motivo: d.motivo,
  };
  const { error } = await supabase.from("revisiones_kcal").insert({
    ...fila,
    cambios: d.propuestas.flatMap((p) =>
      p.cambios.map((c) => ({ tipo: p.tipo, comida: c.comida, alimento: c.alimento, opcion: c.opcion, antes: c.antes, despues: c.despues }))
    ),
  });
  /* Sin la columna "cambios" (SQL aún sin pegar): se guarda igual, sin la lista */
  if (error?.code === "42703" || error?.code === "PGRST204") {
    const r = await supabase.from("revisiones_kcal").insert(fila);
    return !r.error;
  }
  return !error;
}
