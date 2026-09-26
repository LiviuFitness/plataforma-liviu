/**
 * Cumplimiento de la dieta: comidas marcadas como hechas en los últimos
 * 7 días frente a las que tocaban (las comidas de su dieta × 7).
 *
 * Si no ha marcado nada en dos semanas no se da un 0 %: lo más probable
 * es que no use el check, no que no coma. En ese caso devuelve null y
 * no se enseña.
 */
export function adherenciaDieta(
  hechas: { fecha: string }[],
  comidasPorDia: number,
  hoyISO: string
): number | null {
  if (comidasPorDia <= 0) return null;
  const hace14 = sumarDias(hoyISO, -13);
  if (!hechas.some((h) => h.fecha >= hace14)) return null;
  const hace7 = sumarDias(hoyISO, -6);
  const ultimas = hechas.filter((h) => h.fecha >= hace7 && h.fecha <= hoyISO).length;
  return Math.min(100, Math.round((ultimas / (comidasPorDia * 7)) * 100));
}

function sumarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}
