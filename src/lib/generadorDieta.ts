import type { Alimento, CategoriaAlimento } from "./dietas";

/* ============================================================
   Generador automático de comidas: reparte el objetivo diario
   entre las comidas de la dieta y elige alimentos (de entre los
   que le gustan al cliente) resolviendo las cantidades exactas
   con un sistema de ecuaciones para cuadrar proteína, carbohidratos
   y grasas a la vez. No usa IA: es un cálculo determinista sobre
   los datos reales de la base de alimentos.
   ============================================================ */

/** Suplementos/polvos (no son "comida" real; se guardan aparte de las
 * cenas/comidas normales aunque su macro los categorice como carbo/proteína). */
const SUPLEMENTOS_EXCLUIR = new Set([
  "Ciclodextrina",
  "Maltodextrina",
  "Dextrosa",
  "Palatinosa",
  "Carbonox",
  "Vitargo",
  "Amilopectina",
  "Evocarbs 2.0 (HSN)",
  "Proteína ISO Whey",
  "Caseína",
  "Gel energético",
  "Espirulina",
]);

export interface ObjetivoMacros {
  kcal: number;
  prot: number;
  carb: number;
  gras: number;
}

export interface ItemGenerado {
  alimento: Alimento;
  gramos: number;
}

export interface ResultadoGeneracion {
  items: ItemGenerado[];
  logrado: ObjetivoMacros;
  aviso: string | null;
}

/** Peso relativo habitual de cada comida sobre el total del día. */
const PESOS_COMIDA: Record<string, number> = {
  Desayuno: 25,
  "Media mañana": 10,
  Comida: 30,
  Merienda: 10,
  Cena: 20,
  Recena: 5,
};
const PESO_DEFECTO = 15;
// Suma de referencia de un día "típico" con las 6 comidas (25+10+30+10+20+5).
// Es fija a propósito: así cada tipo de comida siempre tiene el mismo % del
// día, sin importar cuántas comidas tengas creadas todavía ni en qué orden
// las vayas generando.
const PESO_TOTAL_DIA = 100;

function pesoComida(nombre: string): number {
  return PESOS_COMIDA[nombre.trim()] ?? PESO_DEFECTO;
}

/** Parte del objetivo del día que le toca a una comida, según su peso habitual. */
export function objetivoPorComida(
  objetivoDia: ObjetivoMacros,
  nombreComida: string
): ObjetivoMacros {
  const share = pesoComida(nombreComida) / PESO_TOTAL_DIA;
  return {
    kcal: objetivoDia.kcal * share,
    prot: objetivoDia.prot * share,
    carb: objetivoDia.carb * share,
    gras: objetivoDia.gras * share,
  };
}

function porCategoria(alimentos: Alimento[], categoria: CategoriaAlimento) {
  return alimentos.filter((a) => a.categoria === categoria);
}

/** Resuelve un sistema 3x3 (Ax = b) por la regla de Cramer. null si es singular. */
function resolver3x3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(A);
  if (Math.abs(d) < 1e-6) return null;
  const conColumna = (col: number) =>
    A.map((fila, i) => fila.map((v, j) => (j === col ? b[i] : v)));
  const x = [0, 1, 2].map((i) => det(conColumna(i)) / d);
  return x.some((v) => !Number.isFinite(v)) ? null : x;
}

function macrosDeGramos(a: Alimento, gramos: number) {
  const f = gramos / 100;
  return {
    kcal: a.kcal_100 * f,
    prot: a.prot_100 * f,
    carb: a.carb_100 * f,
    gras: a.gras_100 * f,
  };
}

function sumarItems(items: ItemGenerado[]): ObjetivoMacros {
  return items.reduce(
    (acc, it) => {
      const m = macrosDeGramos(it.alimento, it.gramos);
      return {
        kcal: acc.kcal + m.kcal,
        prot: acc.prot + m.prot,
        carb: acc.carb + m.carb,
        gras: acc.gras + m.gras,
      };
    },
    { kcal: 0, prot: 0, carb: 0, gras: 0 }
  );
}

const redondear5 = (g: number) => Math.max(5, Math.round(g / 5) * 5);
const GRAMOS_MIN = 5;
const GRAMOS_MAX = 400;
const VERDURA_GRAMOS = 150;
// Por debajo de esto (media mañana, merienda, recena...) los 150 g de
// verdura fija se comerían casi todo el margen de la comida y no dejarían
// hueco realista para el resto — mejor no forzarla en comidas pequeñas.
const KCAL_MIN_PARA_VERDURA = 350;
const MAX_CANDIDATOS_POR_CATEGORIA = 5;

/**
 * Genera una combinación de alimentos (proteína + carbohidrato + grasa,
 * y una verdura fija si hay alguna disponible) que cuadre lo más posible
 * con el objetivo de macros de una comida, usando solo alimentos que le
 * gustan al cliente (ya filtrados en `disponibles`).
 */
export function generarComida(
  objetivo: ObjetivoMacros,
  disponibles: Alimento[]
): ResultadoGeneracion | null {
  const comida = disponibles.filter((a) => !SUPLEMENTOS_EXCLUIR.has(a.nombre));

  // Se ordenan por densidad del macro que les toca aportar, para preferir
  // opciones prácticas (pechuga de pollo, arroz, aceite…) sobre otras que
  // matemáticamente cuadran pero exigirían raciones poco realistas.
  const proteinas = porCategoria(comida, "proteina").sort((a, b) => b.prot_100 - a.prot_100);
  const carbohidratos = porCategoria(comida, "carbohidrato").sort((a, b) => b.carb_100 - a.carb_100);
  const grasas = porCategoria(comida, "grasa").sort((a, b) => b.gras_100 - a.gras_100);
  const verduras = porCategoria(comida, "verdura");

  if (proteinas.length === 0 || carbohidratos.length === 0 || grasas.length === 0) {
    return null;
  }

  const fijos: ItemGenerado[] = [];
  const restante = { ...objetivo };
  const verdura = objetivo.kcal >= KCAL_MIN_PARA_VERDURA ? verduras[0] : undefined;
  if (verdura) {
    const m = macrosDeGramos(verdura, VERDURA_GRAMOS);
    restante.prot -= m.prot;
    restante.carb -= m.carb;
    restante.gras -= m.gras;
    fijos.push({ alimento: verdura, gramos: VERDURA_GRAMOS });
  }

  let mejor: { items: ItemGenerado[]; error: number } | null = null;

  for (const p of proteinas.slice(0, MAX_CANDIDATOS_POR_CATEGORIA)) {
    for (const c of carbohidratos.slice(0, MAX_CANDIDATOS_POR_CATEGORIA)) {
      for (const g of grasas.slice(0, MAX_CANDIDATOS_POR_CATEGORIA)) {
        const A = [
          [p.prot_100 / 100, c.prot_100 / 100, g.prot_100 / 100],
          [p.carb_100 / 100, c.carb_100 / 100, g.carb_100 / 100],
          [p.gras_100 / 100, c.gras_100 / 100, g.gras_100 / 100],
        ];
        const x = resolver3x3(A, [restante.prot, restante.carb, restante.gras]);
        if (!x) continue;
        const [gp, gc, gg] = x; // ya en gramos: A está en macro por gramo
        if ([gp, gc, gg].some((v) => v < GRAMOS_MIN || v > GRAMOS_MAX)) continue;

        const candidatos: ItemGenerado[] = [
          ...fijos,
          { alimento: p, gramos: redondear5(gp) },
          { alimento: c, gramos: redondear5(gc) },
          { alimento: g, gramos: redondear5(gg) },
        ];
        const logrado = sumarItems(candidatos);
        const error =
          Math.abs(logrado.prot - objetivo.prot) +
          Math.abs(logrado.carb - objetivo.carb) +
          Math.abs(logrado.gras - objetivo.gras);

        if (!mejor || error < mejor.error) mejor = { items: candidatos, error };
      }
    }
  }

  if (!mejor) return null;

  const logrado = sumarItems(mejor.items);
  const desviacionKcal =
    objetivo.kcal > 0 ? Math.abs(logrado.kcal - objetivo.kcal) / objetivo.kcal : 0;

  return {
    items: mejor.items,
    logrado,
    aviso:
      desviacionKcal > 0.1
        ? "No se ha podido ajustar del todo con los alimentos disponibles; revisa las cantidades."
        : null,
  };
}
