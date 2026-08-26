import type { Medida } from "./tipos";

/** Una medida corporal del catálogo: dónde se guarda, dónde se dibuja
 * sobre la silueta y —lo importante— cómo se toma. Las instrucciones no
 * son decoración: si un mes se mide la cintura al ombligo y al mes
 * siguiente dos dedos más arriba, la comparación no vale nada. */
export interface DefinicionMedida {
  /** Columna de `medidas` y clave en toda la interfaz. */
  clave: ClaveMedida;
  etiqueta: string;
  /** Instrucción de dónde poner la cinta, en palabras de entrenador. */
  comoMedir: string;
  /** Trazo de la cinta sobre la silueta (viewBox 0 0 200 400). */
  trazo: string;
  /** Punto del cuerpo del que sale la línea guía hacia el dato, para que
   * se vea a qué parte corresponde aunque el dato no quede exactamente a
   * su misma altura (con ocho medidas no caben todas alineadas). */
  ancla: { x: number; y: number };
  /** Posición del chip sobre el lienzo, en % del contenedor. */
  chip: { lado: "izquierda" | "derecha"; top: number };
  min: number;
  max: number;
}

export type ClaveMedida =
  | "cuello"
  | "hombros"
  | "pecho"
  | "brazo"
  | "cintura"
  | "cadera"
  | "pierna"
  | "gemelo";

/** Orden de arriba abajo del cuerpo, que es como se mide en la vida real. */
export const MEDIDAS: DefinicionMedida[] = [
  {
    clave: "cuello",
    etiqueta: "Cuello",
    comoMedir: "Justo por debajo de la nuez, con la cinta horizontal y sin apretar.",
    trazo: "M90 45 Q100 50 110 45",
    ancla: { x: 90, y: 45 },
    chip: { lado: "izquierda", top: 10 },
    min: 25,
    max: 65,
  },
  {
    clave: "hombros",
    etiqueta: "Hombros",
    comoMedir: "Por la parte más ancha, pasando por encima de los deltoides, de pie y relajado.",
    trazo: "M63 61 Q100 50 137 61",
    ancla: { x: 137, y: 61 },
    chip: { lado: "derecha", top: 16.5 },
    min: 80,
    max: 180,
  },
  {
    clave: "pecho",
    etiqueta: "Pecho",
    comoMedir: "A la altura de los pezones, al terminar de soltar el aire con normalidad.",
    trazo: "M70 95 Q100 105 130 95",
    ancla: { x: 70, y: 95 },
    chip: { lado: "izquierda", top: 24 },
    min: 60,
    max: 160,
  },
  {
    clave: "brazo",
    etiqueta: "Bíceps",
    comoMedir: "Brazo colgando relajado, por la parte más gruesa. Mide siempre el mismo brazo.",
    trazo: "M48 106 Q55 110 63 106",
    ancla: { x: 152, y: 106 },
    chip: { lado: "derecha", top: 31 },
    min: 20,
    max: 70,
  },
  {
    clave: "cintura",
    etiqueta: "Cintura",
    comoMedir: "Por el punto más estrecho, normalmente un dedo por encima del ombligo. Sin meter tripa.",
    trazo: "M70 140 Q100 148 130 140",
    ancla: { x: 70, y: 140 },
    chip: { lado: "izquierda", top: 38 },
    min: 45,
    max: 160,
  },
  {
    clave: "cadera",
    etiqueta: "Cadera",
    comoMedir: "Por la parte más ancha de los glúteos, con los pies juntos.",
    trazo: "M63 180 Q100 190 137 180",
    ancla: { x: 137, y: 180 },
    chip: { lado: "derecha", top: 47 },
    min: 60,
    max: 170,
  },
  {
    clave: "pierna",
    etiqueta: "Muslo",
    comoMedir: "A mitad de camino entre la ingle y la rodilla, de pie y con el peso repartido.",
    trazo: "M62 226 Q79 232 96 226",
    ancla: { x: 62, y: 226 },
    chip: { lado: "izquierda", top: 58 },
    min: 30,
    max: 100,
  },
  {
    clave: "gemelo",
    etiqueta: "Gemelo",
    comoMedir: "Por la parte más gruesa, de pie y con el peso repartido en las dos piernas.",
    trazo: "M70 296 Q81 301 92 296",
    ancla: { x: 130, y: 296 },
    chip: { lado: "derecha", top: 76 },
    min: 20,
    max: 70,
  },
];

export const MEDIDA_POR_CLAVE = new Map(MEDIDAS.map((m) => [m.clave, m]));

export interface ValorMedida {
  valor: number;
  fecha: string;
  /** Diferencia con la vez anterior que se midió lo mismo. */
  delta: number | null;
}

/** Último valor registrado de cada medida y cuánto ha cambiado desde la
 * anterior. Recorre el historial completo porque las medidas no se toman
 * todas el mismo día: el pecho puede ser de hace dos semanas y la cintura
 * de ayer, y cada una se compara con SU propia toma anterior. */
export function ultimasMedidas(
  medidas: Medida[]
): Partial<Record<ClaveMedida, ValorMedida>> {
  const ordenadas = medidas
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const resultado: Partial<Record<ClaveMedida, ValorMedida>> = {};

  for (const def of MEDIDAS) {
    const tomas = ordenadas
      .map((m) => ({ valor: m[def.clave], fecha: m.fecha }))
      .filter((t): t is { valor: number; fecha: string } => t.valor !== null)
      .map((t) => ({ valor: Number(t.valor), fecha: t.fecha }));

    if (tomas.length === 0) continue;
    const ultima = tomas[tomas.length - 1];
    const anterior = tomas[tomas.length - 2];
    resultado[def.clave] = {
      valor: ultima.valor,
      fecha: ultima.fecha,
      delta: anterior ? Number((ultima.valor - anterior.valor).toFixed(1)) : null,
    };
  }

  return resultado;
}

/** Índice cintura/cadera. Se prefiere al IMC porque no penaliza la masa
 * muscular (el propio aviso que sale en las apps que enseñan IMC) y
 * porque es el que de verdad se mueve durante una definición. */
export function indiceCinturaCadera(
  valores: Partial<Record<ClaveMedida, ValorMedida>>
): number | null {
  const cintura = valores.cintura?.valor;
  const cadera = valores.cadera?.valor;
  if (!cintura || !cadera) return null;
  return Number((cintura / cadera).toFixed(2));
}

/** Serie histórica de una medida concreta, para la gráfica. */
export function serieDe(medidas: Medida[], clave: ClaveMedida): number[] {
  return medidas
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((m) => m[clave])
    .filter((v): v is number => v !== null)
    .map(Number);
}

/** Un descenso de cintura es buena noticia y una subida de bíceps también:
 * el signo por sí solo no dice si el cambio va en la dirección deseada, así
 * que se colorea neutro y se deja el juicio al entrenador. La excepción es
 * la cintura, donde sí hay consenso. */
export function tonoDelta(clave: ClaveMedida, delta: number): string {
  if (clave === "cintura" && delta < 0) return "var(--color-turquesa)";
  return "var(--color-acento)";
}
