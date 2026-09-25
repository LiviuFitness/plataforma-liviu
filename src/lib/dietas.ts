/* ============================================================
   Nutrición estructurada: tipos, consulta y cálculos.
   Cada comida tiene alimentos con gramos; los totales se
   calculan de la base de alimentos (kcal/macros por 100 g).
   ============================================================ */

export type CategoriaAlimento =
  | "proteina"
  | "carbohidrato"
  | "grasa"
  | "verdura"
  | "fruta"
  | "lacteo"
  | "legumbre"
  | "otro";

export const CATEGORIAS_ALIMENTO: { valor: CategoriaAlimento; etiqueta: string }[] = [
  { valor: "proteina", etiqueta: "Proteína" },
  { valor: "carbohidrato", etiqueta: "Carbohidrato" },
  { valor: "grasa", etiqueta: "Grasa" },
  { valor: "verdura", etiqueta: "Verdura" },
  { valor: "fruta", etiqueta: "Fruta" },
  { valor: "lacteo", etiqueta: "Lácteo" },
  { valor: "legumbre", etiqueta: "Legumbre" },
  { valor: "otro", etiqueta: "Otro" },
];

export interface Alimento {
  id: string;
  nombre: string;
  kcal_100: number;
  prot_100: number;
  carb_100: number;
  gras_100: number;
  fibra_100: number | null;
  categoria: CategoriaAlimento | null;
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
  /** 0 = opción A (la que suma en el día), 1 = opción B. */
  opcion?: number;
  alimentos: Alimento | null;
}

export interface ComidaEstructurada {
  id: string;
  dieta_id: string;
  orden: number;
  nombre: string;
  descripcion_libre: string | null;
  /** Nombre de la opción B ("Avena"), si la comida la tiene. */
  nombre_b?: string | null;
  dieta_comida_alimentos: ItemComida[];
}

/** Los alimentos de una opción de la comida (A por defecto), en orden. */
export function itemsDeOpcion(comida: ComidaEstructurada, opcion: 0 | 1 = 0): ItemComida[] {
  return (comida.dieta_comida_alimentos ?? [])
    .filter((i) => (i.opcion ?? 0) === opcion)
    .slice()
    .sort((a, b) => a.orden - b.orden);
}

/** true si la comida tiene opción B con algún alimento. */
export function tieneOpcionB(comida: ComidaEstructurada): boolean {
  return (comida.dieta_comida_alimentos ?? []).some((i) => (i.opcion ?? 0) === 1);
}

export const SELECT_DIETA_COMPLETA = `
  *,
  dieta_comidas (
    id, dieta_id, orden, nombre, descripcion_libre, nombre_b,
    dieta_comida_alimentos (
      id, alimento_id, gramos, orden, opcion,
      alimentos ( id, nombre, kcal_100, prot_100, carb_100, gras_100, fibra_100, categoria )
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
