/* ============================================================
   Nutrición estructurada: tipos, consulta y cálculos.
   Cada comida tiene alimentos con gramos; los totales se
   calculan de la base de alimentos (kcal/macros por 100 g).
   ============================================================ */

export interface Alimento {
  id: string;
  nombre: string;
  kcal_100: number;
  prot_100: number;
  carb_100: number;
  gras_100: number;
  fibra_100: number | null;
}

export interface Alternativa {
  alimento_id: string;
  nombre: string;
  gramos: number; // 100 g del alimento ≈ estos gramos de la alternativa
  orden: number;
}

export interface ItemComida {
  id: string;
  alimento_id: string;
  gramos: number;
  orden: number;
  alimentos: Alimento | null;
}

export interface ComidaEstructurada {
  id: string;
  dieta_id: string;
  orden: number;
  nombre: string;
  descripcion_libre: string | null;
  dieta_comida_alimentos: ItemComida[];
}

export const SELECT_DIETA_COMPLETA = `
  *,
  dieta_comidas (
    id, dieta_id, orden, nombre, descripcion_libre,
    dieta_comida_alimentos (
      id, alimento_id, gramos, orden,
      alimentos ( id, nombre, kcal_100, prot_100, carb_100, gras_100, fibra_100 )
    )
  )
`;

export interface Totales {
  kcal: number;
  prot: number;
  carb: number;
  gras: number;
}

/** Macros de una cantidad de un alimento. */
export function macrosDe(alimento: Alimento, gramos: number): Totales {
  const f = gramos / 100;
  return {
    kcal: alimento.kcal_100 * f,
    prot: alimento.prot_100 * f,
    carb: alimento.carb_100 * f,
    gras: alimento.gras_100 * f,
  };
}

export function sumar(items: Totales[]): Totales {
  return items.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      prot: a.prot + b.prot,
      carb: a.carb + b.carb,
      gras: a.gras + b.gras,
    }),
    { kcal: 0, prot: 0, carb: 0, gras: 0 }
  );
}

export const r = (n: number) => Math.round(n);
export const r1 = (n: number) => Math.round(n * 10) / 10;
