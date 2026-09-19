import type { CategoriaAlimento, ComidaEstructurada } from "@/lib/dietas";

/**
 * Lista de la compra de una semana, a partir de la dieta ya pautada.
 *
 * La dieta está guardada por días tipo (entreno y descanso), no por
 * semana, así que la semana se compone: los días que entrena llevan la
 * dieta de entreno y el resto la de descanso. Por eso la avena puede
 * salir 485 g y el pollo 1,26 kg — no es "lo de un día por siete".
 *
 * Nace de una queja que se repite: la dieta no se rompe en el
 * supermercado, se rompe en la nevera vacía el martes por la noche.
 */

export interface ArticuloCompra {
  alimentoId: string;
  nombre: string;
  /** Gramos de los siete días, ya sumados */
  gramos: number;
  pasillo: ClavePasillo;
}

export type ClavePasillo = "fresco" | "proteina" | "lacteos" | "despensa";

/* El orden es el del recorrido de un súper, no alfabético: la gracia de
 * una lista de la compra es no tener que volver sobre tus pasos. */
export const PASILLOS: { clave: ClavePasillo; nombre: string; color: string }[] = [
  { clave: "fresco", nombre: "Frutería y verdulería", color: "var(--color-verde)" },
  { clave: "proteina", nombre: "Carnicería y pescadería", color: "var(--color-peligro)" },
  { clave: "lacteos", nombre: "Huevos y lácteos", color: "var(--color-turquesa)" },
  { clave: "despensa", nombre: "Despensa", color: "var(--color-dorado)" },
];

/**
 * El pasillo se deduce de la categoría que ya tiene cada alimento. No
 * separa carnicería de pescadería porque el catálogo no lo sabe: pollo y
 * salmón son los dos "proteína". Antes que inventárselo con reglas por
 * el nombre —que fallan con "tortitas de arroz" o "leche de almendras"—
 * van juntos en un pasillo que dice la verdad.
 */
export function pasilloDe(categoria: CategoriaAlimento | null): ClavePasillo {
  switch (categoria) {
    case "verdura":
    case "fruta":
      return "fresco";
    case "proteina":
      return "proteina";
    case "lacteo":
      return "lacteos";
    default:
      return "despensa";
  }
}

/** 1260 → "1,26 kg" · 105 → "105 g". Como se compra, no como se pauta. */
export function formatoCantidad(gramos: number): string {
  const redondeado = Math.round(gramos);
  if (redondeado >= 1000) {
    return `${(redondeado / 1000)
      .toFixed(2)
      .replace(/\.?0+$/, "")
      .replace(".", ",")} kg`;
  }
  return `${redondeado} g`;
}

function sumarComidas(
  comidas: ComidaEstructurada[],
  veces: number,
  acumulado: Map<string, ArticuloCompra>
) {
  if (veces <= 0) return;
  for (const comida of comidas) {
    for (const item of comida.dieta_comida_alimentos ?? []) {
      const alimento = item.alimentos;
      if (!alimento) continue;
      const previo = acumulado.get(alimento.id);
      const gramos = (Number(item.gramos) || 0) * veces;
      if (previo) {
        previo.gramos += gramos;
      } else {
        acumulado.set(alimento.id, {
          alimentoId: alimento.id,
          nombre: alimento.nombre,
          gramos,
          pasillo: pasilloDe(alimento.categoria),
        });
      }
    }
  }
}

/**
 * @param diasEntreno días de la semana con entreno pautado (0-7). Si no
 * hay dieta de descanso, se asume que come la de entreno los siete días.
 */
export function listaCompra(
  comidasEntreno: ComidaEstructurada[],
  comidasDescanso: ComidaEstructurada[],
  diasEntreno: number
): ArticuloCompra[] {
  const dias = Math.max(0, Math.min(7, diasEntreno));
  const hayDescanso = comidasDescanso.length > 0;
  const acumulado = new Map<string, ArticuloCompra>();

  sumarComidas(comidasEntreno, hayDescanso ? dias : 7, acumulado);
  if (hayDescanso) sumarComidas(comidasDescanso, 7 - dias, acumulado);

  return [...acumulado.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Lunes de la semana en curso, en ISO corto — para que la lista marcada
 * se olvide sola cada semana. */
export function lunesDeEstaSemana(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toLocaleDateString("sv-SE");
}
