/* ============================================================
   Calculadora de discos: dado un peso objetivo y el peso de la
   barra, calcula qué discos poner en cada lado (algoritmo voraz
   con el set de discos estándar de gimnasio).
   ============================================================ */

export interface Disco {
  kg: number;
  color: string; // color IPF estándar, para el dibujo de la barra
}

export const DISCOS_ESTANDAR: Disco[] = [
  { kg: 25, color: "#E23B3B" },
  { kg: 20, color: "#2E7FE2" },
  { kg: 15, color: "#E2C22E" },
  { kg: 10, color: "#3BAA4C" },
  { kg: 5, color: "#F2F2F2" },
  { kg: 2.5, color: "#1A1A1A" },
  { kg: 1.25, color: "#B9C2C9" },
];

export const PESOS_BARRA = [
  { valor: 20, etiqueta: "Barra olímpica — 20 kg" },
  { valor: 15, etiqueta: "Barra mujer — 15 kg" },
  { valor: 10, etiqueta: "Barra técnica — 10 kg" },
  { valor: 0, etiqueta: "Sin barra (mancuerna, máquina…)" },
];

export interface ResultadoCarga {
  porLado: Disco[]; // de mayor a menor
  pesoPorLado: number;
  pesoTotal: number;
  exacto: boolean;
}

/** Reparte el peso por lado con los discos disponibles (algoritmo voraz). */
export function calcularCarga(
  pesoObjetivo: number,
  pesoBarra: number,
  discosDisponibles: Disco[] = DISCOS_ESTANDAR
): ResultadoCarga {
  const objetivoPorLado = Math.max(0, (pesoObjetivo - pesoBarra) / 2);
  const discos = [...discosDisponibles].sort((a, b) => b.kg - a.kg);
  const porLado: Disco[] = [];
  let restante = objetivoPorLado;
  const EPSILON = 0.001;

  for (const disco of discos) {
    while (restante + EPSILON >= disco.kg) {
      porLado.push(disco);
      restante -= disco.kg;
    }
  }

  const pesoPorLado = porLado.reduce((a, d) => a + d.kg, 0);
  const pesoTotal = pesoBarra + pesoPorLado * 2;

  return {
    porLado,
    pesoPorLado,
    pesoTotal,
    exacto: Math.abs(pesoTotal - pesoObjetivo) < 0.01,
  };
}
